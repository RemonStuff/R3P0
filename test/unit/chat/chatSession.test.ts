import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatSession } from "../../../src/core/chat/chatSession";
import type { ChatSessionOptions } from "../../../src/core/chat/chatSession";
import type { HostMessage } from "../../../src/core/protocol/messages";
import { parseHostMessage } from "../../../src/core/protocol/parse";
import type { Reply, ReplyOutcome, SendFailure, Usage } from "../../../src/core/types";
import { FakeBudget } from "../../fakes/fakeBudget";
import { FakeCancellation } from "../../fakes/fakeCancellation";
import { FixedClock } from "../../fakes/fixedClock";

const at = "2026-10-19T12:00:00.000Z";
const model = { vendor: "test", id: "fixed-model", name: "Fixed model" };
const usage: Usage = { cost: 7.5, unit: "credits", borrowed: 2.5 };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const contexts: { clock: FixedClock; messages: HostMessage[] }[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function setup(overrides: Partial<ChatSessionOptions> = {}) {
  const clock = new FixedClock(at);
  const budget = new FakeBudget({ clock });
  const signal = new FakeCancellation();
  const messages: HostMessage[] = [];
  const send = vi.spyOn(budget, "send");
  const session = new ChatSession({
    tabKey: "file:///repo",
    subject: "owner/repo",
    model,
    budget,
    clock,
    emit: (message) => messages.push(message),
    ...overrides,
  });
  const context = { clock, budget, signal, messages, send, session };
  contexts.push(context);
  return context;
}

function reply(chunks: readonly string[], outcome: Promise<ReplyOutcome>): Reply {
  return {
    chunks: (async function* () {
      yield* chunks;
    })(),
    outcome,
  };
}

afterEach(() => {
  for (const { clock, messages } of contexts.splice(0)) {
    expect(clock.pendingTimers).toBe(0);
    for (const message of messages) {
      expect(parseHostMessage(message)).toEqual({ ok: true, msg: message });
    }
  }
});

describe("ChatSession", () => {
  it("starts idle with an empty transcript", () => {
    expect(setup().session.snapshot()).toEqual({ phase: "idle", turns: [], streaming: null });
  });

  it("admits a user turn and a separate streaming reply synchronously", async () => {
    const { session, budget, signal, messages } = setup();
    budget.scriptReply({ chunks: ["hello"], cost: 3 });
    const pending = session.send("Prompt", signal);
    const state = session.snapshot();
    const started = messages[0];
    expect(started?.type).toBe("turnStarted");
    if (started?.type !== "turnStarted") throw new Error("Missing turnStarted");
    expect(started).toMatchObject({
      v: 1,
      tabKey: "file:///repo",
      userTurn: { role: "user", text: "Prompt", attachments: [], at },
      model,
      at,
    });
    expect(started.turnId).not.toBe(started.userTurn.id);
    expect(state).toEqual({
      phase: "sending",
      turns: [started.userTurn],
      streaming: { id: started.turnId, text: "", model, at },
    });
    await pending;
    expect(session.snapshot()).toEqual({
      phase: "idle",
      turns: [
        started.userTurn,
        {
          id: started.turnId,
          role: "assistant",
          text: "hello",
          status: "complete",
          model,
          at,
          usage: { cost: 3, unit: "tokens", borrowed: 0 },
        },
      ],
      streaming: null,
    });
  });

  it("batches three chunks within 50 ms and exposes all partial text for snapshots", async () => {
    const { session, budget, signal, messages, clock } = setup();
    budget.scriptReply({ chunks: ["a", "b", "c", "d"], delayMs: 20 });
    const pending = session.send("Prompt", signal);
    await flush();
    for (let i = 0; i < 3; i++) {
      clock.advance(20);
      await flush();
    }
    expect(session.snapshot()).toMatchObject({
      phase: "streaming",
      streaming: { text: "abc" },
    });
    expect(messages.filter((message) => message.type === "chunk")).toEqual([]);
    clock.advance(9);
    expect(messages).toHaveLength(1);
    clock.advance(1);
    expect(messages.filter((message) => message.type === "chunk")).toMatchObject([{ text: "abc" }]);
    clock.advance(10);
    await pending;
    expect(messages.map((message) => message.type)).toEqual([
      "turnStarted",
      "chunk",
      "chunk",
      "turnEnded",
    ]);
    expect(messages.filter((message) => message.type === "chunk").map((m) => m.text)).toEqual([
      "abc",
      "d",
    ]);
  });

  it("flushes early at 2048 UTF-8 bytes without waiting for completion", async () => {
    const { session, budget, signal, messages, clock } = setup();
    budget.scriptReply({ chunks: ["\u{1f642}".repeat(511), "\u{1f642}", "tail"], delayMs: 5 });
    const pending = session.send("Prompt", signal);
    await flush();
    clock.advance(5);
    await flush();
    expect(messages).toHaveLength(1);
    clock.advance(5);
    await flush();
    expect(messages.filter((message) => message.type === "chunk")).toMatchObject([
      { text: "\u{1f642}".repeat(512) },
    ]);
    expect(messages.some((message) => message.type === "turnEnded")).toBe(false);
    clock.advance(5);
    await pending;
  });

  it("flushes the remainder before one final message with the reported usage", async () => {
    const { session, budget, signal, messages, clock } = setup();
    budget.scriptReply({ chunks: [" a", "", "\n", "b "], ...usage });
    await session.send("Prompt", signal);
    expect(messages.map((message) => message.type)).toEqual(["turnStarted", "chunk", "turnEnded"]);
    expect(messages[1]).toMatchObject({ text: " a\nb " });
    expect(messages[2]).toMatchObject({ status: "complete", usage });
    expect(session.snapshot().turns[1]).toMatchObject({
      text: " a\nb ",
      status: "complete",
      usage,
    });
    const started = messages[0];
    if (started?.type !== "turnStarted") throw new Error("Missing turnStarted");
    for (const message of messages) {
      expect(message).toMatchObject({ tabKey: "file:///repo", turnId: started.turnId });
    }
    clock.advance(500);
    expect(messages).toHaveLength(3);
  });

  it("ends an empty reply without emitting an empty chunk", async () => {
    const { session, budget, signal, messages } = setup();
    budget.scriptReply({ chunks: [], ...usage });
    await session.send("Prompt", signal);
    expect(messages.map((message) => message.type)).toEqual(["turnStarted", "turnEnded"]);
    expect(session.snapshot().turns[1]).toMatchObject({ text: "", status: "complete", usage });
  });

  it("sends the explicit subject, model ref and plain transcript, without a placeholder", async () => {
    const { session, budget, signal, send, clock } = setup();
    budget.scriptReply({ chunks: ["First answer"] });
    budget.scriptReply({ chunks: ["Second answer"] });
    await session.send(" \nFirst prompt\t ", signal);
    clock.advance(1000);
    await session.send("Second prompt", signal);
    expect(budget.calls.send).toEqual([
      {
        subject: "owner/repo",
        model: { vendor: model.vendor, id: model.id },
        messages: [{ role: "user", content: "First prompt" }],
      },
      {
        subject: "owner/repo",
        model: { vendor: model.vendor, id: model.id },
        messages: [
          { role: "user", content: "First prompt" },
          { role: "assistant", content: "First answer" },
          { role: "user", content: "Second prompt" },
        ],
      },
    ]);
    expect(send.mock.calls.every((call) => call[1] === signal)).toBe(true);
    expect(budget.calls.check).toEqual([]);
    expect(budget.calls.allowReserve).toEqual([]);
    const turns = session.snapshot().turns;
    expect(new Set(turns.map((turn) => turn.id)).size).toBe(4);
    expect(turns[2]?.at).toBe("2026-10-19T12:00:01.000Z");
  });

  it.each([
    { label: "empty", text: "" },
    { label: "whitespace", text: " \n\t " },
    { label: "over 100,000 UTF-8 bytes", text: "\u{1f642}".repeat(25_001) },
  ])("rejects $label before creating turns or calling the budget", async ({ text }) => {
    const { session, signal, send, messages } = setup();
    await expect(session.send(text, signal)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(messages).toEqual([]);
    expect(session.snapshot()).toEqual({ phase: "idle", turns: [], streaming: null });
  });

  it("ignores a second send while waiting for BudgetPort.send", async () => {
    const { session, signal, send, messages } = setup();
    const gate = deferred<Reply>();
    send.mockImplementationOnce(() => gate.promise);
    const pending = session.send("first", signal);
    expect(session.snapshot().phase).toBe("sending");
    await session.send("ignored", signal);
    expect(send).toHaveBeenCalledTimes(1);
    expect(messages).toHaveLength(1);
    expect(session.snapshot().turns).toHaveLength(1);
    gate.resolve(reply(["answer"], Promise.resolve({ status: "complete", usage })));
    await pending;
    expect(session.snapshot().turns).toHaveLength(2);
  });

  it("ignores a second send while streaming", async () => {
    const { session, signal, send, budget, clock } = setup();
    budget.scriptReply({ chunks: ["answer"], delayMs: 10 });
    const pending = session.send("first", signal);
    await flush();
    expect(session.snapshot().phase).toBe("streaming");
    await session.send("ignored", signal);
    expect(send).toHaveBeenCalledTimes(1);
    expect(session.snapshot().turns).toHaveLength(1);
    clock.advance(10);
    await pending;
    expect(session.snapshot().turns).toHaveLength(2);
  });

  it("stays busy after the last chunk until the final outcome arrives", async () => {
    const { session, signal, send, clock, messages } = setup();
    const outcome = deferred<ReplyOutcome>();
    send.mockResolvedValueOnce(reply(["answer"], outcome.promise));
    const pending = session.send("first", signal);
    await flush();
    clock.advance(50);
    expect(messages.map((message) => message.type)).toEqual(["turnStarted", "chunk"]);
    expect(session.snapshot().phase).toBe("streaming");
    await session.send("ignored", signal);
    expect(send).toHaveBeenCalledTimes(1);
    outcome.resolve({ status: "complete", usage });
    await pending;
    expect(session.snapshot()).toMatchObject({ phase: "idle", streaming: null });
    expect(messages.at(-1)).toMatchObject({ type: "turnEnded", usage });
  });

  it("keeps the gate closed during reentrant start and end notifications", async () => {
    const nested: Promise<void>[] = [];
    const context = setup({
      emit: (message) => {
        context.messages.push(message);
        if (message.type === "turnStarted" || message.type === "turnEnded") {
          nested.push(context.session.send("ignored", context.signal));
        }
      },
    });
    context.budget.scriptReply({ chunks: ["answer"] });
    await context.session.send("first", context.signal);
    await Promise.all(nested);
    expect(context.send).toHaveBeenCalledTimes(1);
    expect(context.session.snapshot().turns).toHaveLength(2);
  });

  const refusals: SendFailure[] = [
    { kind: "refused", code: "over-budget", message: "Weekly budget spent" },
    { kind: "refused", code: "blocked", message: "Subject blocked" },
    { kind: "refused", code: "no-prices", message: "Prices unavailable" },
    { kind: "refused", code: "needs-reserve-approval", message: "Allow reserve first" },
    { kind: "refused", code: "unknown", message: "New refusal" },
    { kind: "model", code: "not-found", message: "Model gone" },
    { kind: "model", code: "no-permissions", message: "Consent denied" },
    { kind: "model", code: "blocked", message: "Model blocked" },
    { kind: "model", code: "unknown", message: "New model failure" },
  ];
  it.each(refusals)(
    "preserves pre-stream $kind / $code errors without invented usage",
    async (failure) => {
      const { session, budget, signal, messages } = setup();
      budget.scriptReply({ reject: failure });
      await session.send("Prompt", signal);
      expect(session.snapshot()).toMatchObject({
        phase: "idle",
        streaming: null,
        turns: [
          { role: "user" },
          { role: "assistant", text: "", status: "failed", error: failure.message },
        ],
      });
      expect(session.snapshot().turns[1]).not.toHaveProperty("usage");
      expect(messages.map((message) => message.type)).toEqual(["turnStarted", "turnEnded"]);
      expect(messages.at(-1)).toMatchObject({ status: "failed", error: failure.message });
      expect(messages.at(-1)).not.toHaveProperty("usage");
    },
  );

  it("can send again after a failure without leaking state or IDs", async () => {
    const { session, budget, signal, send, messages } = setup();
    budget.scriptReply({
      reject: { kind: "refused", code: "over-budget", message: "Weekly budget spent" },
    });
    budget.scriptReply({ chunks: ["recovered"], ...usage });
    await session.send("first", signal);
    await session.send("second", signal);
    expect(send).toHaveBeenCalledTimes(2);
    const state = session.snapshot();
    expect(state).toMatchObject({ phase: "idle", streaming: null });
    expect(state.turns).toHaveLength(4);
    expect(state.turns[3]).toMatchObject({ text: "recovered", status: "complete", usage });
    expect(new Set(state.turns.map((turn) => turn.id)).size).toBe(4);
    expect(messages.filter((message) => message.type === "turnEnded")).toHaveLength(2);
  });

  it("keeps partial text and real usage when the reported outcome fails", async () => {
    const { session, budget, signal, messages } = setup();
    budget.scriptReply({
      chunks: ["partial", " answer", "not reached"],
      failAfter: 2,
      failMessage: "Provider failed",
      ...usage,
    });
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).toMatchObject({
      text: "partial answer",
      status: "failed",
      error: "Provider failed",
      usage,
    });
    expect(messages.map((message) => message.type)).toEqual(["turnStarted", "chunk", "turnEnded"]);
    expect(messages[1]).toMatchObject({ text: "partial answer" });
    expect(messages.at(-1)).toMatchObject({ status: "failed", error: "Provider failed", usage });
  });

  it.each(["failed", "complete"] as const)(
    "keeps partial text on an iterator exception even if the outcome is %s",
    async (status) => {
      const { session, signal, send, messages } = setup();
      send.mockResolvedValueOnce({
        chunks: (async function* () {
          yield "partial";
          throw new Error("Stream broke");
        })(),
        outcome: Promise.resolve(
          status === "complete" ? { status, usage } : { status, usage, message: "Stream broke" },
        ),
      });
      await session.send("Prompt", signal);
      expect(session.snapshot()).toMatchObject({
        phase: "idle",
        streaming: null,
        turns: [
          { role: "user" },
          { text: "partial", status: "failed", error: "Stream broke", usage },
        ],
      });
      expect(messages.filter((message) => message.type === "turnEnded")).toHaveLength(1);
      expect(messages.at(-1)).toMatchObject({ status: "failed", error: "Stream broke", usage });
    },
  );

  it("handles a stream getter failure and still retains reported usage", async () => {
    const { session, signal, send } = setup();
    send.mockResolvedValueOnce({
      get chunks(): AsyncIterable<string> {
        throw new Error("Stream unavailable");
      },
      outcome: Promise.resolve({ status: "failed", message: "Stream unavailable", usage }),
    });
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).toMatchObject({
      text: "",
      status: "failed",
      error: "Stream unavailable",
      usage,
    });
  });

  it("does not invent usage for a failed outcome without usage", async () => {
    const { session, signal, send, messages } = setup();
    send.mockResolvedValueOnce(
      reply(["partial"], Promise.resolve({ status: "failed", message: "No usage reported" })),
    );
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).not.toHaveProperty("usage");
    expect(messages.at(-1)).toMatchObject({ status: "failed", error: "No usage reported" });
    expect(messages.at(-1)).not.toHaveProperty("usage");
  });

  it("surfaces a rejected outcome as failed, with partial text and no invented cost", async () => {
    const { session, signal, send, messages } = setup();
    send.mockResolvedValueOnce({
      chunks: (async function* () {
        yield "partial";
      })(),
      get outcome(): Promise<ReplyOutcome> {
        return Promise.reject(new Error("Outcome unavailable"));
      },
    });
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).toMatchObject({
      text: "partial",
      status: "failed",
      error: "Outcome unavailable",
    });
    expect(messages.at(-1)).not.toHaveProperty("usage");
  });

  it.each([
    { error: new Error("Request failed"), message: "Request failed" },
    { error: "Connection lost", message: "Connection lost" },
    { error: {}, message: "The request failed" },
    { error: undefined, message: "The request failed" },
    { error: "", message: "The request failed" },
    { error: new Error(""), message: "The request failed" },
    {
      error: new Proxy(
        {},
        {
          getPrototypeOf: () => {
            throw new Error("Unsafe error");
          },
        },
      ),
      message: "The request failed",
    },
  ])("renders unexpected send errors safely: $message", async ({ error, message }) => {
    const { session, signal, send, messages } = setup();
    send.mockRejectedValueOnce(error);
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).toMatchObject({ status: "failed", error: message });
    expect(messages.at(-1)).toMatchObject({ status: "failed", error: message });
  });

  it("preserves stopped-by-budget and borrowed usage rather than reporting failure", async () => {
    const { session, budget, signal, messages } = setup();
    budget.scriptReply({ chunks: ["budget-limited"], stop: "budget", ...usage });
    await session.send("Prompt", signal);
    expect(session.snapshot().turns[1]).toMatchObject({
      text: "budget-limited",
      status: "stopped-by-budget",
      usage,
    });
    expect(messages.at(-1)).toMatchObject({ status: "stopped-by-budget", usage });
    expect(messages.at(-1)).not.toHaveProperty("error");
  });

  it("passes cancellation through and preserves the partial reply and reported cost", async () => {
    const { session, budget, signal, clock, messages } = setup();
    budget.scriptReply({ chunks: ["partial", "not reached"], delayMs: 10, ...usage });
    const pending = session.send("Prompt", signal);
    await flush();
    clock.advance(10);
    await flush();
    expect(session.snapshot().streaming?.text).toBe("partial");
    signal.cancel();
    await pending;
    expect(session.snapshot().turns[1]).toMatchObject({
      text: "partial",
      status: "stopped-by-user",
      usage,
    });
    expect(messages.at(-1)).toMatchObject({ status: "stopped-by-user", usage });
    const before = structuredClone(messages);
    clock.advance(500);
    expect(messages).toEqual(before);
  });

  it("allows separate sessions to stream independently with isolated transcripts", async () => {
    const first = setup();
    const second = setup({ tabKey: "file:///other", subject: "owner/other" });
    first.budget.scriptReply({ chunks: ["one"], delayMs: 10 });
    second.budget.scriptReply({ chunks: ["two"], delayMs: 10 });
    const a = first.session.send("first", first.signal);
    const b = second.session.send("second", second.signal);
    await flush();
    expect(first.session.snapshot().phase).toBe("streaming");
    expect(second.session.snapshot().phase).toBe("streaming");
    second.clock.advance(10);
    await b;
    expect(first.session.snapshot().turns).toHaveLength(1);
    expect(second.session.snapshot().turns[1]?.text).toBe("two");
    expect(second.budget.calls.send[0]?.subject).toBe("owner/other");
    first.clock.advance(10);
    await a;
    expect(first.session.snapshot().turns[1]?.text).toBe("one");
    expect(
      second.messages.every((message) => "tabKey" in message && message.tabKey === "file:///other"),
    ).toBe(true);
  });

  it("returns detached snapshots during and after streaming", async () => {
    const { session, budget, signal, clock } = setup();
    budget.scriptReply({ chunks: ["partial", " answer"], delayMs: 10, ...usage });
    const pending = session.send("Prompt", signal);
    await flush();
    clock.advance(10);
    await flush();
    const current = session.snapshot();
    Object.assign(current.turns[0] ?? {}, { text: "changed" });
    Object.assign(current.streaming ?? {}, { text: "changed" });
    Object.assign(current.streaming?.model ?? {}, { name: "changed" });
    expect(session.snapshot().streaming).toMatchObject({ text: "partial", model });
    clock.advance(10);
    await pending;
    const saved = session.snapshot();
    const assistant = saved.turns[1];
    if (assistant?.role !== "assistant") throw new Error("Missing assistant turn");
    Object.assign(assistant.usage ?? {}, { cost: 999 });
    Object.assign(assistant.model, { name: "changed" });
    expect(session.snapshot().turns[0]?.text).toBe("Prompt");
    expect(session.snapshot().turns[1]).toMatchObject({ text: "partial answer", model, usage });
  });

  it.each(["turnStarted", "chunk", "turnEnded"] as const)(
    "propagates a %s sink failure without leaking the busy gate or timers",
    async (type) => {
      const error = new Error("Webview delivery failed");
      let fail = true;
      const context = setup({
        emit: (message) => {
          if (fail && message.type === type) throw error;
          context.messages.push(message);
        },
      });
      context.budget.scriptReply({ chunks: ["a".repeat(2048)], ...usage });
      await expect(context.session.send("first", context.signal)).rejects.toBe(error);
      expect(context.session.snapshot()).toMatchObject({ phase: "idle", streaming: null });
      expect(context.clock.pendingTimers).toBe(0);
      expect(context.session.snapshot().turns).toHaveLength(2);
      expect(context.messages.filter((message) => message.type === "turnEnded")).toHaveLength(0);
      if (type === "turnEnded") {
        expect(context.session.snapshot().turns[1]).toMatchObject({ status: "complete", usage });
      } else {
        expect(context.session.snapshot().turns[1]).toMatchObject({
          status: "failed",
          error: error.message,
        });
      }
      fail = false;
      await context.session.send("second", context.signal);
      expect(context.session.snapshot().turns).toHaveLength(4);
    },
  );

  it.each(Array.from({ length: 20 }, (_, i) => i + 1))(
    "preserves the exact text across seeded Unicode chunking %i",
    async (seed) => {
      const { session, budget, signal, messages } = setup();
      const text = " \n\u{1f642}\u4e2d e\u0301\t".repeat(800) + "\ud800end ";
      const chunks: string[] = [];
      for (let offset = 0; offset < text.length;) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const size = 1 + (seed % 80);
        chunks.push(text.slice(offset, offset + size));
        offset += size;
      }
      budget.scriptReply({ chunks, ...usage });
      await session.send("Prompt", signal);
      expect(session.snapshot().turns[1]?.text).toBe(text);
      expect(
        messages
          .filter((message) => message.type === "chunk")
          .map((m) => m.text)
          .join(""),
      ).toBe(text);
      expect(messages.filter((message) => message.type === "turnEnded")).toHaveLength(1);
    },
  );
});
