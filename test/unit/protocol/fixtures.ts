import type { AssistantTurn, UserTurn } from "../../../src/core/types";
import type { HostMessage, ViewState } from "../../../src/core/protocol/messages";

export const tabKey = "file:///workspace/r3p0";
export const at = "2026-10-19T13:20:00.000Z";
export const model = { vendor: "r3p0-test", id: "mini", name: "Fake Mini" };
export const usage = { cost: 12, unit: "tokens", borrowed: 2 } as const;
export const userTurn: UserTurn = {
  id: "user-1",
  role: "user",
  text: "Hello",
  attachments: [{ path: "README.md", bytes: 10 }],
  at,
};
export const assistantTurn: AssistantTurn = {
  id: "assistant-1",
  role: "assistant",
  text: "Hi",
  status: "complete",
  model,
  usage,
  at,
};
export const state: ViewState = {
  tabs: [
    {
      key: tabKey,
      label: "r3p0",
      turns: [userTurn, assistantTurn],
      streaming: { id: "assistant-2", text: "Partial ", model, at },
      error: "An earlier request failed",
    },
  ],
  activeTab: tabKey,
  availability: { state: "ready", degraded: [] },
};
export const started = { tabKey, turnId: "assistant-2", userTurn, model, at };
export const ended = {
  tabKey,
  turnId: "assistant-2",
  status: "complete",
  usage,
} as const;
export const hostSamples: readonly HostMessage[] = [
  { v: 1, type: "snapshot", state },
  { v: 1, type: "turnStarted", ...started },
  { v: 1, type: "chunk", tabKey, turnId: "assistant-2", text: "  next\n" },
  { v: 1, type: "turnEnded", ...ended },
  { v: 1, type: "error", message: "Cannot send", tabKey },
];
