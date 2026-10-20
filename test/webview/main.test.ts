import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hostMessages } from "../../src/core/protocol/messages";
import { FakeVsCodeApi } from "./fakeVsCodeApi";
import {
  assistantTurn,
  at,
  model,
  state,
  tabKey,
  usage,
  userTurn,
} from "../unit/protocol/fixtures";

const ready = {
  ...state,
  tabs: [{ key: tabKey, label: "r3p0", turns: [], streaming: null }],
};

describe("webview entry point and message pump", () => {
  let api: FakeVsCodeApi;
  let root: HTMLDivElement;
  let acquire: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    document.body.replaceChildren();
    root = document.createElement("div");
    root.id = "r3p0-root";
    document.body.append(root);
    api = new FakeVsCodeApi();
    acquire = vi.fn(() => api);
    vi.stubGlobal("acquireVsCodeApi", acquire);
  });

  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function load(): Promise<void> {
    await import("../../src/webview/main");
  }

  function receive(data: unknown): void {
    window.dispatchEvent(new MessageEvent("message", { data }));
  }

  function type(text: string): HTMLTextAreaElement {
    const input = root.querySelector("textarea")!;
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input;
  }

  it("acquires the VS Code API once and posts ready on load", async () => {
    await load();
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(api.posted).toEqual([{ v: 1, type: "ready" }]);
    expect(root.querySelector("textarea")?.disabled).toBe(true);
    expect(root.querySelector('[role="status"]')?.textContent).toContain("Waiting");
  });

  it("registers the message listener before asking for a snapshot", async () => {
    api.onPost = (message) => {
      if (message.type === "ready") receive(hostMessages.snapshot(ready));
    };
    await load();
    expect(root.querySelector("textarea")?.disabled).toBe(false);
  });

  it("does not acquire the API or replace the installed placeholder without the chat root", async () => {
    document.body.replaceChildren();
    const placeholder = document.createElement("h1");
    placeholder.textContent = "R3P0 isn't wired yet";
    document.body.append(placeholder);
    await load();
    expect(acquire).not.toHaveBeenCalled();
    expect(placeholder.isConnected).toBe(true);
    expect(document.body.children).toHaveLength(1);
  });

  it("renders a snapshot and leaves unrelated DOM alone", async () => {
    const sibling = document.createElement("p");
    sibling.textContent = "Unrelated";
    document.body.prepend(sibling);
    await load();
    receive(
      hostMessages.snapshot({
        ...ready,
        tabs: [{ ...ready.tabs[0]!, turns: [userTurn, assistantTurn] }],
      }),
    );
    expect([...root.querySelectorAll(".turn-text")].map((node) => node.textContent)).toEqual([
      "Hello",
      "Hi",
    ]);
    expect(root.querySelector("textarea")?.disabled).toBe(false);
    expect(sibling.isConnected).toBe(true);
  });

  it("reduces streaming messages and keeps partial text, terminal errors and input gates", async () => {
    await load();
    receive(hostMessages.snapshot(ready));
    receive(
      hostMessages.turnStarted({
        tabKey,
        turnId: "reply",
        userTurn,
        model,
        at,
      }),
    );
    expect(root.querySelector("textarea")?.disabled).toBe(true);
    receive(hostMessages.chunk(tabKey, "reply", "  partial\n"));
    receive(hostMessages.chunk(tabKey, "reply", "<script>literal</script>🙂"));
    expect(root.querySelector('[data-role="assistant"] .turn-text')?.textContent).toBe(
      "  partial\n<script>literal</script>🙂",
    );
    receive(
      hostMessages.turnEnded({
        tabKey,
        turnId: "reply",
        status: "failed",
        usage,
        error: "<img src=x> failed",
      }),
    );
    expect(root.querySelector("textarea")?.disabled).toBe(false);
    expect(root.querySelector('[data-status="failed"] .turn-text')?.textContent).toBe(
      "  partial\n<script>literal</script>🙂",
    );
    expect(root.querySelector(".turn-error")?.textContent).toBe("<img src=x> failed");
    expect(root.querySelector("script, img")).toBeNull();
    expect(root.querySelector(".typing-indicator")).toBeNull();
  });

  it.each([
    null,
    { v: 99, type: "snapshot", state: ready },
    { v: 1, type: "chunk", tabKey, turnId: "reply", text: 42 },
    { v: 1, type: "snapshot", state: { ...ready, tabs: "private prompt" } },
    { v: 1, type: "unknown" },
  ])("ignores invalid host messages and logs only the parser reason: %j", async (invalid) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await load();
    receive(hostMessages.snapshot(ready));
    type("private draft");
    const before = root.textContent;
    receive(invalid);
    expect(root.textContent).toBe(before);
    expect(root.querySelector("textarea")?.value).toBe("private draft");
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private prompt|private draft/);
  });

  it("uses the selected tab key when sending and leaves transcript ownership to the host", async () => {
    await load();
    receive(
      hostMessages.snapshot({
        ...ready,
        activeTab: "file:///other",
        tabs: [...ready.tabs, { ...ready.tabs[0]!, key: "file:///other" }],
      }),
    );
    type("  send this  ");
    root.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    expect(api.posted).toEqual([
      { v: 1, type: "ready" },
      { v: 1, type: "send", tabKey: "file:///other", text: "send this" },
    ]);
    expect(root.querySelectorAll("[data-role]")).toHaveLength(0);
    expect(api.getState()).toEqual({ draft: "" });
  });

  it("does not show another tab's stream or enable input after an unrelated completion", async () => {
    await load();
    receive(
      hostMessages.snapshot({
        ...ready,
        tabs: [...ready.tabs, { ...ready.tabs[0]!, key: "other" }],
      }),
    );
    receive(hostMessages.turnStarted({ tabKey, turnId: "reply", userTurn, model, at }));
    receive(
      hostMessages.turnStarted({
        tabKey: "other",
        turnId: "reply",
        userTurn,
        model,
        at,
      }),
    );
    receive(hostMessages.chunk("other", "reply", "not this tab"));
    receive(hostMessages.turnEnded({ tabKey: "other", turnId: "reply", status: "complete" }));
    expect(root.textContent).not.toContain("not this tab");
    expect(root.querySelector("textarea")?.disabled).toBe(true);
  });

  it("shows literal global and tab errors without exposing inactive errors", async () => {
    await load();
    receive(hostMessages.error("<script>global error</script>"));
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      "<script>global error</script>",
    );
    receive(
      hostMessages.snapshot({
        ...ready,
        tabs: [
          { ...ready.tabs[0]!, error: "<img src=x> tab error" },
          { ...ready.tabs[0]!, key: "other", error: "hidden error" },
        ],
      }),
    );
    expect(root.textContent).toContain("<img src=x> tab error");
    expect(root.textContent).not.toContain("hidden error");
    expect(root.textContent).not.toContain("global error");
    expect(root.querySelector("script, img")).toBeNull();
  });

  it("explains unavailable input, preserves the draft and recovers on a ready snapshot", async () => {
    await load();
    receive(hostMessages.snapshot(ready));
    type("keep me");
    receive(hostMessages.snapshot({ ...ready, availability: { state: "missing" } }));
    expect(root.querySelector("textarea")?.disabled).toBe(true);
    expect(root.textContent).toContain("Q0T4");
    expect(root.textContent).toContain("unavailable");
    expect(root.querySelector("textarea")?.value).toBe("keep me");
    receive(hostMessages.snapshot(ready));
    expect(root.querySelector("textarea")?.disabled).toBe(false);
    expect(root.textContent).not.toContain("unavailable");
  });

  it("keeps only the exact unsent draft in setState and restores it after reload", async () => {
    await load();
    receive(hostMessages.snapshot(ready));
    type("  unfinished\n🙂 ");
    expect(api.getState()).toEqual({ draft: "  unfinished\n🙂 " });
    receive(hostMessages.snapshot(state));
    expect(api.saved).toEqual([{ draft: "  unfinished\n🙂 " }]);
    window.dispatchEvent(new Event("pagehide"));
    vi.resetModules();
    await load();
    expect(root.querySelector("textarea")?.value).toBe("  unfinished\n🙂 ");
    expect(root.querySelectorAll("[data-role]")).toHaveLength(0);
    expect(root.querySelector("textarea")?.disabled).toBe(true);
    expect(api.posted.filter((message) => message.type === "ready")).toHaveLength(2);
  });

  it.each([undefined, null, 42, [], { draft: 42 }, { transcript: "not a draft" }])(
    "ignores malformed cosmetic state without restoring host state: %j",
    async (saved) => {
      api = new FakeVsCodeApi(saved);
      await load();
      expect(root.querySelector("textarea")?.value).toBe("");
      expect(api.posted).toEqual([{ v: 1, type: "ready" }]);
    },
  );

  it("removes message and composer listeners on pagehide", async () => {
    await load();
    receive(hostMessages.snapshot(ready));
    const input = type("draft");
    window.dispatchEvent(new Event("pagehide"));
    receive(hostMessages.snapshot(state));
    input.value = "after disposal";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    root.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    expect(root.querySelectorAll("[data-role]")).toHaveLength(0);
    expect(api.getState()).toEqual({ draft: "draft" });
    expect(api.posted).toEqual([{ v: 1, type: "ready" }]);
  });
});
