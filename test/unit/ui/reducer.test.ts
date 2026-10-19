import { describe, expect, it } from "vitest";
import { ChatSession } from "../../../src/core/chat/chatSession";
import { hostMessages } from "../../../src/core/protocol/messages";
import type { HostMessage, TabView } from "../../../src/core/protocol/messages";
import { parseHostMessage } from "../../../src/core/protocol/parse";
import type { AssistantTurn, TurnStatus, Usage, UserTurn } from "../../../src/core/types";
import { dismissError, reduce } from "../../../src/core/ui/reducer";
import { isInputEnabled, selectTranscript } from "../../../src/core/ui/selectors";
import { createInitialState } from "../../../src/core/ui/state";
import type { UiState } from "../../../src/core/ui/state";
import { FakeBudget } from "../../fakes/fakeBudget";
import type { ReplyScript } from "../../fakes/fakeBudget";
import { FakeCancellation } from "../../fakes/fakeCancellation";
import { FixedClock } from "../../fakes/fixedClock";

const key = "file:///repo";
const otherKey = "file:///other";
const at = "2026-10-19T15:00:00.000Z";
const model = { vendor: "test", id: "fixed-model", name: "Fixed model" };
const usage: Usage = { cost: 7.5, unit: "credits", borrowed: 2.5 };
const statuses = [
  "complete",
  "stopped-by-user",
  "stopped-by-budget",
  "failed",
  "interrupted",
] as const satisfies readonly TurnStatus[];

function freeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object") {
    const children: readonly unknown[] = Object.values(value);
    for (const child of children) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function user(overrides: Partial<UserTurn> = {}): UserTurn {
  return {
    id: "user",
    role: "user",
    text: "Prompt",
    attachments: [{ path: "src/example.ts", bytes: 42 }],
    at,
    ...overrides,
  };
}

function assistant(overrides: Partial<AssistantTurn> = {}): AssistantTurn {
  return {
    id: "assistant",
    role: "assistant",
    text: "Answer",
    status: "complete",
    model,
    at,
    ...overrides,
  };
}

function tab(overrides: Partial<TabView> = {}): TabView {
  return { key, label: "owner/repo", turns: [], streaming: null, ...overrides };
}

function state(overrides: Partial<UiState> = {}): UiState {
  return freeze({
    tabs: [tab(), tab({ key: otherKey, label: "owner/other" })],
    activeTab: key,
    availability: { state: "ready", degraded: [] },
    ...overrides,
  });
}

function streamingState(overrides: Partial<UiState> = {}): UiState {
  return state({
    tabs: [
      tab({ turns: [user()], streaming: { id: "assistant", text: "Partial", model, at } }),
      tab({ key: otherKey, label: "owner/other" }),
    ],
    ...overrides,
  });
}

function getTab(value: UiState, tabKey = key): TabView {
  const found = value.tabs.find((item) => item.key === tabKey);
  if (!found) throw new Error(`Expected tab ${tabKey}`);
  return found;
}

function started(
  overrides: Partial<Extract<HostMessage, { type: "turnStarted" }>> = {},
): Extract<HostMessage, { type: "turnStarted" }> {
  return hostMessages.turnStarted({
    tabKey: key,
    turnId: "assistant",
    userTurn: user(),
    model,
    at,
    ...overrides,
  });
}

function ended(
  overrides: Partial<Extract<HostMessage, { type: "turnEnded" }>> = {},
): Extract<HostMessage, { type: "turnEnded" }> {
  return hostMessages.turnEnded({
    tabKey: key,
    turnId: "assistant",
    status: "complete",
    ...overrides,
  });
}

function apply(previous: UiState, message: HostMessage): UiState {
  return reduce(freeze(previous), freeze(message));
}

describe("UI state", () => {
  it("starts with no tabs, no selection, missing availability and disabled input", () => {
    const initial = createInitialState();
    expect(initial).toEqual({ tabs: [], activeTab: null, availability: { state: "missing" } });
    expect(selectTranscript(initial)).toEqual({ turns: [], streaming: null });
    expect(isInputEnabled(initial)).toBe(false);
  });

  it("creates independent initial states", () => {
    const first = createInitialState();
    const second = createInitialState();
    expect(first).not.toBe(second);
    expect(first.tabs).not.toBe(second.tabs);
    expect(first.availability).not.toBe(second.availability);
  });
});

describe("snapshot", () => {
  it("replaces the whole state, including selection, availability and old errors", () => {
    const previous = state({
      globalError: "Old global error",
      tabs: [tab({ error: "Old tab error" })],
    });
    const next = {
      tabs: [tab({ key: otherKey, turns: [user(), assistant()], error: "Current error" })],
      activeTab: otherKey,
      availability: { state: "missing" },
    } satisfies UiState;
    expect(apply(previous, hostMessages.snapshot(next))).toEqual(next);
  });

  it("can remove every tab and discard an old stream", () => {
    expect(apply(streamingState(), hostMessages.snapshot(createInitialState()))).toEqual(
      createInitialState(),
    );
  });

  it("restores a partial stream and appends only subsequent chunks", () => {
    const snapshot = hostMessages.snapshot(streamingState());
    const restored = apply(createInitialState(), snapshot);
    expect(restored).toEqual(snapshot.state);
    const next = apply(restored, hostMessages.chunk(key, "assistant", " continuation"));
    expect(selectTranscript(next)).toEqual({
      turns: [user()],
      streaming: { id: "assistant", text: "Partial continuation", model, at },
    });
    expect(getTab(snapshot.state).streaming?.text).toBe("Partial");
  });

  it("uses a later snapshot to repair ignored unknown-turn chunks", () => {
    const initial = state();
    expect(apply(initial, hostMessages.chunk(key, "assistant", "lost"))).toBe(initial);
    const repaired = apply(initial, hostMessages.snapshot(streamingState()));
    expect(getTab(repaired).streaming?.text).toBe("Partial");
  });

  it("restores the input gate from authoritative availability", () => {
    const ready = state();
    const missing = apply(
      ready,
      hostMessages.snapshot(state({ availability: { state: "missing" } })),
    );
    expect(isInputEnabled(missing)).toBe(false);
    expect(isInputEnabled(apply(missing, hostMessages.snapshot(ready)))).toBe(true);
  });
});

describe("turnStarted", () => {
  it("adds the user turn and a separate empty streaming assistant turn", () => {
    const next = apply(state(), started());
    expect(getTab(next)).toEqual(
      tab({ turns: [user()], streaming: { id: "assistant", text: "", model, at } }),
    );
    expect(isInputEnabled(next)).toBe(false);
  });

  it("preserves history, clears only the tab banner, and does not mutate frozen input", () => {
    const history = [user({ id: "old-user" }), assistant({ id: "old-assistant" })];
    const previous = state({
      globalError: "Global warning",
      tabs: [tab({ turns: history, error: "Previous failure" }), tab({ key: otherKey })],
    });
    const before = structuredClone(previous);
    const message = started();
    const messageBefore = structuredClone(message);
    const next = apply(previous, message);
    expect(getTab(next).turns).toEqual([...history, user()]);
    expect(getTab(next)).not.toHaveProperty("error");
    expect(next.globalError).toBe("Global warning");
    expect(next.activeTab).toBe(previous.activeTab);
    expect(next.availability).toBe(previous.availability);
    expect(getTab(next, otherKey)).toBe(getTab(previous, otherKey));
    expect(previous).toEqual(before);
    expect(message).toEqual(messageBefore);
  });

  it("updates an inactive tab without changing selection or the active transcript", () => {
    const previous = state();
    const next = apply(previous, started({ tabKey: otherKey }));
    expect(next.activeTab).toBe(key);
    expect(getTab(next)).toBe(getTab(previous));
    expect(getTab(next, otherKey).turns).toEqual([user()]);
    expect(getTab(next, otherKey).streaming?.id).toBe("assistant");
    expect(isInputEnabled(next)).toBe(true);
  });

  it("treats turn IDs as tab-scoped, not globally unique", () => {
    const previous = streamingState();
    const next = apply(previous, started({ tabKey: otherKey }));
    expect(getTab(next)).toBe(getTab(previous));
    expect(getTab(next, otherKey).streaming?.id).toBe("assistant");
  });

  it("ignores a start for an unknown tab", () => {
    const previous = state();
    expect(apply(previous, started({ tabKey: "unknown" }))).toBe(previous);
  });

  it.each(["assistant", "another-assistant"])(
    "does not replace an existing stream with %s",
    (turnId) => {
      const previous = streamingState();
      expect(apply(previous, started({ turnId, userTurn: user({ id: "another-user" }) }))).toBe(
        previous,
      );
    },
  );

  it.each([
    { turnId: "assistant", userTurn: user({ id: "new-user" }) },
    { turnId: "new-assistant", userTurn: user() },
    { turnId: "user", userTurn: user({ id: "new-user" }) },
    { turnId: "new-assistant", userTurn: user({ id: "assistant" }) },
    { turnId: "same", userTurn: user({ id: "same" }) },
  ])("ignores reused or colliding IDs: $turnId / $userTurn.id", (overrides) => {
    const previous = state({ tabs: [tab({ turns: [user(), assistant()] })] });
    expect(apply(previous, started(overrides))).toBe(previous);
  });
});

describe("chunk", () => {
  it("appends text without trimming, escaping, deduplicating or changing Unicode", () => {
    const chunks = [" a", "\n", "\ud83d", "\ude42", "ha", "ha", "", "\t<script>"];
    const previous = streamingState();
    const next = chunks.reduce(
      (value, text) => apply(value, hostMessages.chunk(key, "assistant", text)),
      previous,
    );
    expect(getTab(next).streaming).toEqual({
      id: "assistant",
      text: `Partial${chunks.join("")}`,
      model,
      at,
    });
    expect(getTab(next).turns).toBe(getTab(previous).turns);
    expect(getTab(next, otherKey)).toBe(getTab(previous, otherKey));
    expect(getTab(previous).streaming?.text).toBe("Partial");
  });

  it("preserves the state reference for an empty chunk", () => {
    const previous = streamingState();
    expect(apply(previous, hostMessages.chunk(key, "assistant", ""))).toBe(previous);
  });

  it.each([
    { label: "unknown tab", tabKey: "unknown", turnId: "assistant" },
    { label: "unknown turn", tabKey: key, turnId: "unknown" },
    { label: "idle tab", tabKey: otherKey, turnId: "assistant" },
  ])("ignores a chunk for an $label", ({ tabKey, turnId }) => {
    const previous = streamingState();
    expect(apply(previous, hostMessages.chunk(tabKey, turnId, "late"))).toBe(previous);
  });

  it("ignores a chunk for an already completed turn", () => {
    const previous = state({ tabs: [tab({ turns: [user(), assistant()] })] });
    expect(apply(previous, hostMessages.chunk(key, "assistant", "late"))).toBe(previous);
  });

  it("updates only the named tab when two tabs use the same turn ID", () => {
    const first = getTab(streamingState());
    const previous = state({ tabs: [first, { ...first, key: otherKey }] });
    const next = apply(previous, hostMessages.chunk(otherKey, "assistant", " other"));
    expect(getTab(next)).toBe(first);
    expect(getTab(next, otherKey).streaming?.text).toBe("Partial other");
    expect(next.activeTab).toBe(key);
  });
});

describe("turnEnded", () => {
  it.each(statuses)(
    "finishes %s with partial text, model, timestamp and reported usage",
    (status) => {
      const previous = streamingState();
      const next = apply(previous, ended({ status, usage }));
      expect(getTab(next)).toEqual(
        tab({ turns: [user(), assistant({ text: "Partial", status, usage })] }),
      );
      expect(isInputEnabled(next)).toBe(true);
      expect(getTab(next, otherKey)).toBe(getTab(previous, otherKey));
      expect(getTab(previous).streaming?.text).toBe("Partial");
    },
  );

  it("preserves a failed turn's error without inventing usage or explicit undefined fields", () => {
    const next = apply(streamingState(), ended({ status: "failed", error: "Connection lost" }));
    expect(getTab(next).turns).toEqual([
      user(),
      assistant({ text: "Partial", status: "failed", error: "Connection lost" }),
    ]);
    expect(getTab(next).turns[1]).not.toHaveProperty("usage");
  });

  it("preserves zero reported usage and an explicitly empty error", () => {
    const zero: Usage = { cost: 0, unit: "tokens", borrowed: 0 };
    const next = apply(streamingState(), ended({ status: "failed", usage: zero, error: "" }));
    expect(getTab(next).turns[1]).toEqual(
      assistant({ text: "Partial", status: "failed", usage: zero, error: "" }),
    );
  });

  it("does not add absent optional fields or lose existing tab/global banners", () => {
    const previous = streamingState({
      globalError: "Global warning",
      tabs: [tab({ ...getTab(streamingState()), error: "Tab warning" })],
    });
    const next = apply(previous, ended());
    expect(getTab(next).turns[1]).not.toHaveProperty("usage");
    expect(getTab(next).turns[1]).not.toHaveProperty("error");
    expect(getTab(next).error).toBe("Tab warning");
    expect(next.globalError).toBe("Global warning");
  });

  it("can finish an empty reply", () => {
    const previous = streamingState({
      tabs: [tab({ turns: [user()], streaming: { id: "assistant", text: "", model, at } })],
    });
    expect(getTab(apply(previous, ended())).turns[1]).toEqual(assistant({ text: "" }));
  });

  it.each([
    { label: "unknown tab", tabKey: "unknown", turnId: "assistant" },
    { label: "different turn", tabKey: key, turnId: "other-assistant" },
    { label: "idle tab", tabKey: otherKey, turnId: "assistant" },
  ])("ignores completion for an $label", ({ tabKey, turnId }) => {
    const previous = streamingState();
    expect(apply(previous, ended({ tabKey, turnId }))).toBe(previous);
  });

  it("ignores repeated completion without appending a second assistant turn", () => {
    const previous = state({ tabs: [tab({ turns: [user(), assistant()] })] });
    expect(apply(previous, ended({ status: "failed", error: "Late" }))).toBe(previous);
  });
});

describe("error banners", () => {
  it("sets literal tab error text without mutating another tab", () => {
    const previous = state();
    const text = " <script>literal</script>\nDetails ";
    const next = apply(previous, hostMessages.error(text, key));
    expect(getTab(next).error).toBe(text);
    expect(getTab(next, otherKey)).toBe(getTab(previous, otherKey));
    expect(isInputEnabled(next)).toBe(true);
  });

  it("sets an inactive tab's error without changing the active tab", () => {
    const previous = state();
    const next = apply(previous, hostMessages.error("Background error", otherKey));
    expect(getTab(next)).toBe(getTab(previous));
    expect(getTab(next, otherKey).error).toBe("Background error");
    expect(next.activeTab).toBe(key);
  });

  it("does not finish a stream or enable its input when an error banner arrives", () => {
    const previous = streamingState();
    const next = apply(previous, hostMessages.error("Warning", key));
    expect(getTab(next).streaming).toBe(getTab(previous).streaming);
    expect(getTab(next).turns).toBe(getTab(previous).turns);
    expect(getTab(next).error).toBe("Warning");
    expect(isInputEnabled(next)).toBe(false);
  });

  it("keeps an unscoped error global even with no selected tab", () => {
    const previous = state({ activeTab: null });
    const next = apply(previous, hostMessages.error("Global failure"));
    expect(next.globalError).toBe("Global failure");
    expect(next.tabs).toBe(previous.tabs);
    expect(next.activeTab).toBeNull();
  });

  it("can show a global error before the first snapshot", () => {
    const next = apply(createInitialState(), hostMessages.error("Startup failed"));
    expect(next).toEqual({ ...createInitialState(), globalError: "Startup failed" });
  });

  it("keeps global and tab errors independent", () => {
    const previous = state({ globalError: "Global failure" });
    const next = apply(previous, hostMessages.error("Tab failure", key));
    expect(next.globalError).toBe("Global failure");
    expect(getTab(next).error).toBe("Tab failure");
    const updated = apply(next, hostMessages.error("New global failure"));
    expect(updated.globalError).toBe("New global failure");
    expect(updated.tabs).toBe(next.tabs);
  });

  it("does not redirect an unknown tab's error to another tab or a global banner", () => {
    const previous = state({ globalError: "Existing error" });
    expect(apply(previous, hostMessages.error("Unknown", "unknown"))).toBe(previous);
  });

  it("preserves identity when a tab or global error is unchanged", () => {
    const previous = state({ globalError: "Global", tabs: [tab({ error: "Tab" })] });
    expect(apply(previous, hostMessages.error("Global"))).toBe(previous);
    expect(apply(previous, hostMessages.error("Tab", key))).toBe(previous);
  });
});

describe("dismissError", () => {
  it("dismisses only the global banner without setting an undefined field", () => {
    const previous = state({ globalError: "Global", tabs: [tab({ error: "Tab" })] });
    const next = dismissError(previous);
    expect(next).not.toHaveProperty("globalError");
    expect(next.tabs).toBe(previous.tabs);
    expect(getTab(next).error).toBe("Tab");
    expect(previous.globalError).toBe("Global");
  });

  it("dismisses only the selected tab banner and preserves failed-turn details", () => {
    const failed = assistant({ status: "failed", error: "Historical failure" });
    const previous = state({
      globalError: "Global",
      tabs: [
        tab({ turns: [user(), failed], error: "Tab" }),
        tab({ key: otherKey, error: "Other" }),
      ],
    });
    const next = dismissError(previous, key);
    expect(getTab(next)).not.toHaveProperty("error");
    expect(getTab(next).turns).toBe(getTab(previous).turns);
    expect(getTab(next).turns[1]).toEqual(failed);
    expect(getTab(next, otherKey)).toBe(getTab(previous, otherKey));
    expect(next.globalError).toBe("Global");
    expect(getTab(previous).error).toBe("Tab");
  });

  it.each([undefined, key, "unknown"])("is a no-op when no banner exists for %s", (tabKey) => {
    const previous = state();
    expect(dismissError(previous, tabKey)).toBe(previous);
  });
});

describe("selectors", () => {
  it("returns the active transcript with a separate partial turn and no fabricated status", () => {
    const previous = streamingState();
    expect(selectTranscript(previous)).toEqual({
      turns: [user()],
      streaming: { id: "assistant", text: "Partial", model, at },
    });
    expect(selectTranscript(previous).turns).toBe(getTab(previous).turns);
    expect(selectTranscript(previous).streaming).toBe(getTab(previous).streaming);
    expect(selectTranscript(previous).streaming).not.toHaveProperty("status");
  });

  it("selects the named active tab, not the first tab", () => {
    const previous = streamingState({ activeTab: otherKey });
    expect(selectTranscript(previous)).toEqual({ turns: [], streaming: null });
    expect(isInputEnabled(previous)).toBe(true);
  });

  it.each([null, "unknown", "overview"])(
    "has no active transcript or enabled input for %s",
    (activeTab) => {
      const previous = streamingState({ activeTab });
      expect(selectTranscript(previous)).toEqual({ turns: [], streaming: null });
      expect(isInputEnabled(previous)).toBe(false);
    },
  );

  it("enables an idle tab only when availability is ready", () => {
    expect(isInputEnabled(state())).toBe(true);
    expect(isInputEnabled(state({ availability: { state: "missing" } }))).toBe(false);
  });

  it.each(["getStatus", "canSpend", "onDidChangeUsage"] as const)(
    "keeps ready-but-degraded %s usable",
    (member) => {
      expect(isInputEnabled(state({ availability: { state: "ready", degraded: [member] } }))).toBe(
        true,
      );
    },
  );

  it("disables input for an empty streaming reply, not just one with text", () => {
    const previous = streamingState({
      tabs: [tab({ streaming: { id: "assistant", text: "", model, at } })],
    });
    expect(isInputEnabled(previous)).toBe(false);
  });
});

describe("actual ChatSession messages", () => {
  const cases = [
    { label: "complete", script: { chunks: [" a", "\n", "b "], ...usage } },
    { label: "empty complete", script: { chunks: [], ...usage } },
    { label: "budget stop", script: { chunks: ["Partial"], stop: "budget", ...usage } },
    {
      label: "partial failure",
      script: { chunks: ["Partial", "Lost"], failAfter: 1, failMessage: "Failure", ...usage },
    },
    {
      label: "pre-stream refusal",
      script: { reject: { kind: "refused", code: "blocked", message: "Blocked" } },
    },
    { label: "user stop", script: { chunks: ["Not delivered"], ...usage } },
  ] satisfies readonly { label: string; script: ReplyScript }[];

  it.each(cases)(
    "projects $label into the same transcript as the session snapshot",
    async ({ label, script }) => {
      const clock = new FixedClock(at);
      const budget = new FakeBudget({ clock });
      const signal = new FakeCancellation();
      let current = state({ tabs: [tab()] });
      const observed: UiState[] = [];
      const session = new ChatSession({
        tabKey: key,
        subject: "owner/repo",
        model,
        budget,
        clock,
        emit: (message) => {
          const parsed = parseHostMessage(message);
          if (!parsed.ok) throw new Error(parsed.reason);
          current = apply(current, parsed.msg);
          observed.push(current);
        },
      });
      budget.scriptReply(script);
      if (label === "user stop") signal.cancel();
      await session.send("Prompt", signal);
      const snapshot = session.snapshot();
      expect(selectTranscript(current)).toEqual({
        turns: snapshot.turns,
        streaming: snapshot.streaming,
      });
      expect(isInputEnabled(current)).toBe(true);
      expect(observed[0] && isInputEnabled(observed[0])).toBe(false);
      expect(clock.pendingTimers).toBe(0);
      expect(budget.calls.send).toHaveLength(1);
    },
  );
});
