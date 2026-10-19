import type { TabView } from "../protocol/messages";
import type { Transcript, UiState } from "./state";

export function selectTranscript(state: UiState): Transcript {
  const tab = activeTab(state);
  return { turns: tab?.turns ?? [], streaming: tab?.streaming ?? null };
}

export function isInputEnabled(state: UiState): boolean {
  const tab = activeTab(state);
  return state.availability.state === "ready" && tab !== undefined && tab.streaming === null;
}

function activeTab(state: UiState): TabView | undefined {
  return state.tabs.find((tab) => tab.key === state.activeTab);
}
