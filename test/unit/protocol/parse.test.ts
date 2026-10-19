import { describe, expect, it, vi } from "vitest";
import {
  hostMessages,
  MAX_SEND_BYTES,
  PROTOCOL_VERSION,
} from "../../../src/core/protocol/messages";
import { parseHostMessage, parseWebviewMessage } from "../../../src/core/protocol/parse";
import {
  assistantTurn,
  at,
  ended,
  hostSamples,
  model,
  started,
  state,
  tabKey,
  usage,
  userTurn,
} from "./fixtures";

const send = { v: 1, type: "send", tabKey, text: "Hello" };
const snapshot = (changes: Record<string, unknown>) => ({
  v: 1,
  type: "snapshot",
  state: { ...state, ...changes },
});
const tab = (changes: Record<string, unknown>) =>
  snapshot({
    tabs: [{ ...state.tabs[0], ...changes }],
  });
const turn = (value: unknown) => tab({ turns: [value] });

function expectRejected(
  result: ReturnType<typeof parseWebviewMessage> | ReturnType<typeof parseHostMessage>,
) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason.trim().length).toBeGreaterThan(0);
}

describe("webview protocol", () => {
  it("uses protocol version 1 and a 100,000 byte send limit", () => {
    expect(PROTOCOL_VERSION).toBe(1);
    expect(MAX_SEND_BYTES).toBe(100_000);
  });

  it("parses ready into a fresh object", () => {
    const raw = { v: 1, type: "ready" };
    const result = parseWebviewMessage(raw);
    expect(result).toEqual({ ok: true, msg: raw });
    if (result.ok) expect(result.msg).not.toBe(raw);
  });

  it("parses send and trims only the prompt", () => {
    expect(parseWebviewMessage({ ...send, text: " \nHello 🙂\t " })).toEqual({
      ok: true,
      msg: { ...send, text: "Hello 🙂" },
    });
  });

  it.each(["", " ", "\n\t", "\u2003"])("rejects empty text %j", (text) => {
    expectRejected(parseWebviewMessage({ ...send, text }));
  });

  it.each([undefined, null, 1, false, {}, []])("rejects non-string text %j", (text) => {
    expectRejected(parseWebviewMessage({ ...send, text }));
  });

  it("accepts exactly the byte limit after trimming", () => {
    const text = "a".repeat(MAX_SEND_BYTES);
    expect(parseWebviewMessage({ ...send, text: ` ${text}\n` })).toEqual({
      ok: true,
      msg: { ...send, text },
    });
  });

  it("rejects one ASCII byte over the limit", () => {
    expectRejected(parseWebviewMessage({ ...send, text: "a".repeat(MAX_SEND_BYTES + 1) }));
  });

  it("counts UTF-8 bytes, not JavaScript characters", () => {
    const text = "🙂".repeat(MAX_SEND_BYTES / 4);
    expect(parseWebviewMessage({ ...send, text })).toEqual({ ok: true, msg: { ...send, text } });
    expectRejected(parseWebviewMessage({ ...send, text: `${text}a` }));
    expectRejected(parseWebviewMessage({ ...send, text: "é".repeat(MAX_SEND_BYTES / 2 + 1) }));
  });

  it.each([undefined, null, "", " ", 1, {}, []])("rejects invalid tabKey %j", (key) => {
    expectRejected(parseWebviewMessage({ ...send, tabKey: key }));
  });

  it("ignores and strips unknown fields without reading them", () => {
    const getter = vi.fn(() => {
      throw new Error("must not read extra fields");
    });
    const raw = Object.defineProperty({ ...send, extra: 42 }, "ignored", { get: getter });
    expect(parseWebviewMessage(raw)).toEqual({ ok: true, msg: send });
    expect(getter).not.toHaveBeenCalled();
  });
});

describe("host protocol", () => {
  it.each(hostSamples)("parses $type", (msg) => {
    expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
  });

  it("round-trips every builder through JSON", () => {
    const messages = [
      hostMessages.snapshot(state),
      hostMessages.turnStarted(started),
      hostMessages.chunk(tabKey, "assistant-2", "\n  text 🙂 "),
      hostMessages.turnEnded(ended),
      hostMessages.error("Cannot send", tabKey),
      hostMessages.error("Global error"),
    ];
    for (const msg of messages) {
      expect(parseHostMessage(JSON.parse(JSON.stringify(msg)))).toEqual({ ok: true, msg });
    }
    expect(hostMessages.error("Global error")).not.toHaveProperty("tabKey");
  });

  it("builders cannot have their envelope overwritten by payload fields", () => {
    expect(hostMessages.turnStarted({ ...started, ...{ v: 99, type: "send" } })).toEqual({
      ...started,
      v: 1,
      type: "turnStarted",
    });
    expect(hostMessages.turnEnded({ ...ended, ...{ v: 99, type: "send" } })).toEqual({
      ...ended,
      v: 1,
      type: "turnEnded",
    });
  });

  it("preserves empty and whitespace-only chunks", () => {
    for (const text of ["", " \n\t", "🙂"]) {
      const msg = { v: 1, type: "chunk", tabKey, turnId: "assistant-2", text };
      expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
    }
  });

  it("accepts the empty snapshot with missing availability", () => {
    const msg = snapshot({ tabs: [], activeTab: null, availability: { state: "missing" } });
    expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
  });

  it("accepts a non-streaming tab without an error", () => {
    const msg = snapshot({ tabs: [{ key: tabKey, label: "r3p0", turns: [], streaming: null }] });
    expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
  });

  it.each(["complete", "stopped-by-user", "stopped-by-budget", "failed", "interrupted"])(
    "accepts turn status %s with optional usage and error",
    (status) => {
      const msg = {
        v: 1,
        type: "turnEnded",
        tabKey,
        turnId: "assistant-2",
        status,
        error: "Details",
      };
      expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
      const saved = turn({ ...assistantTurn, status, error: "Details" });
      expect(parseHostMessage(saved)).toEqual({ ok: true, msg: saved });
    },
  );

  it("accepts fractional credit usage", () => {
    const msg = {
      v: 1,
      type: "turnEnded",
      ...ended,
      usage: { cost: 0.5, unit: "credits", borrowed: 0.1 },
    };
    expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
  });

  it("accepts all known degraded members", () => {
    const msg = snapshot({
      availability: { state: "ready", degraded: ["getStatus", "canSpend", "onDidChangeUsage"] },
    });
    expect(parseHostMessage(msg)).toEqual({ ok: true, msg });
  });

  it("strips unknown fields at every nested level and does not alias the input", () => {
    const msg = snapshot({
      extra: true,
      tabs: [
        {
          ...state.tabs[0],
          extra: true,
          turns: [
            {
              ...userTurn,
              extra: true,
              attachments: [{ path: "README.md", bytes: 10, extra: true }],
            },
            {
              ...assistantTurn,
              extra: true,
              model: { ...model, extra: true },
              usage: { ...usage, extra: true },
            },
          ],
          streaming: {
            id: "assistant-2",
            text: "Partial ",
            model: { ...model, extra: true },
            at,
            extra: true,
          },
        },
      ],
      availability: { state: "ready", degraded: [], extra: true },
    });
    const result = parseHostMessage({ ...msg, extra: true });
    expect(result).toEqual({ ok: true, msg: hostSamples[0] });
    if (result.ok && result.msg.type === "snapshot") {
      expect(result.msg.state).not.toBe(msg.state);
      expect(result.msg.state.tabs).not.toBe(msg.state.tabs);
      expect(result.msg.state.tabs[0]?.turns[0]).not.toBe(userTurn);
      expect(result.msg.state.tabs[0]?.streaming?.model).not.toBe(model);
    }
  });

  const invalid = [
    { v: 1, type: "snapshot", state: null },
    snapshot({ tabs: {} }),
    snapshot({ tabs: [null] }),
    snapshot({ tabs: new Array(1) }),
    snapshot({ activeTab: 1 }),
    snapshot({ availability: {} }),
    snapshot({ availability: { state: "blocked" } }),
    snapshot({ availability: { state: "ready", degraded: "getStatus" } }),
    snapshot({ availability: { state: "ready", degraded: ["unknown"] } }),
    tab({ key: "" }),
    tab({ label: 1 }),
    tab({ turns: {} }),
    tab({ turns: [null] }),
    tab({ streaming: {} }),
    tab({ streaming: { id: "", text: "", model, at } }),
    tab({ streaming: { id: "x", text: 1, model, at } }),
    tab({ error: 2 }),
    turn({ ...userTurn, role: "system" }),
    turn({ ...userTurn, id: "" }),
    turn({ ...userTurn, text: 1 }),
    turn({ ...userTurn, at: null }),
    turn({ ...userTurn, attachments: null }),
    turn({ ...userTurn, attachments: [{ path: 1, bytes: 10 }] }),
    turn({ ...userTurn, attachments: [{ path: "file", bytes: -1 }] }),
    turn({ ...userTurn, attachments: [{ path: "file", bytes: 1.5 }] }),
    turn({ ...assistantTurn, status: "streaming" }),
    turn({ ...assistantTurn, model: { ...model, vendor: "" } }),
    turn({ ...assistantTurn, model: { ...model, id: 1 } }),
    turn({ ...assistantTurn, model: { ...model, name: null } }),
    turn({ ...assistantTurn, usage: { ...usage, cost: -1 } }),
    turn({ ...assistantTurn, error: false }),
    { v: 1, type: "turnStarted", ...started, turnId: null },
    { v: 1, type: "turnStarted", ...started, userTurn: assistantTurn },
    { v: 1, type: "turnStarted", ...started, model: null },
    { v: 1, type: "turnStarted", ...started, at: "" },
    { v: 1, type: "chunk", tabKey, turnId: "x", text: false },
    { v: 1, type: "chunk", tabKey: " ", turnId: "x", text: "ok" },
    { v: 1, type: "turnEnded", ...ended, status: "streaming" },
    { v: 1, type: "turnEnded", ...ended, usage: null },
    { v: 1, type: "turnEnded", ...ended, usage: { ...usage, cost: Infinity } },
    { v: 1, type: "turnEnded", ...ended, usage: { ...usage, borrowed: NaN } },
    { v: 1, type: "turnEnded", ...ended, usage: { ...usage, unit: "dollars" } },
    { v: 1, type: "turnEnded", ...ended, error: 1 },
    { v: 1, type: "error", message: "" },
    { v: 1, type: "error", message: 1 },
    { v: 1, type: "error", message: "Failed", tabKey: null },
    { v: 1, type: "error", message: "Failed", tabKey: undefined },
  ];
  it.each(invalid.map((raw, index) => ({ raw, index })))(
    "rejects malformed host payload $index",
    ({ raw }) => {
      expectRejected(parseHostMessage(raw));
    },
  );
});

describe.each([
  { direction: "webview", parse: parseWebviewMessage, valid: { v: 1, type: "ready" } },
  { direction: "host", parse: parseHostMessage, valid: { v: 1, type: "error", message: "Failed" } },
])("$direction boundary", ({ parse, valid }) => {
  it.each([undefined, null, "text", 1, true, [], () => {}, new Date()])(
    "rejects non-record input %j",
    (raw) => {
      expectRejected(parse(raw));
    },
  );
  it.each([undefined, null, 0, 2, "1", true])("rejects protocol version %j", (v) => {
    const result = parse({ ...valid, v });
    expectRejected(result);
    if (!result.ok) expect(result.reason).toMatch(/version|v\b/i);
  });
  it.each(["unknown", undefined, null, 1])("rejects message type %j", (type) => {
    expectRejected(parse({ ...valid, type }));
  });
  it("rejects inherited fields", () => {
    expectRejected(parse(Object.create(valid)));
  });
  it("accepts a null-prototype record", () => {
    expect(parse(Object.assign(Object.create(null), valid))).toEqual({ ok: true, msg: valid });
  });
  it("rejects a throwing getter without invoking it", () => {
    const getter = vi.fn(() => {
      throw new Error("hostile");
    });
    expectRejected(parse(Object.defineProperty({ ...valid }, "v", { get: getter })));
    expect(getter).not.toHaveBeenCalled();
  });
  it("ignores __proto__ and constructor keys without polluting prototypes", () => {
    const extra: unknown = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
    );
    const raw = Object.assign(Object.create(null), valid, extra);
    expect(parse(raw)).toEqual({ ok: true, msg: valid });
    expect("polluted" in Object.prototype).toBe(false);
  });
  it("never throws when a proxy trap or even the thrown value is hostile", () => {
    const thrown = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("hostile error");
        },
      },
    );
    const raw = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw thrown;
        },
      },
    );
    expect(() => parse(raw)).not.toThrow();
    expectRejected(parse(raw));
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() => parse(revoked.proxy)).not.toThrow();
    expectRejected(parse(revoked.proxy));
    const descriptors = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("hostile descriptor");
        },
      },
    );
    expectRejected(parse(descriptors));
  });
});
