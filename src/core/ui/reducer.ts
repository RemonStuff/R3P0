import type { HostMessage, TabView } from "../protocol/messages";
import type { AssistantTurn, TabKey } from "../types";
import type { UiState } from "./state";

export function reduce(state: UiState, message: HostMessage): UiState {
  switch (message.type) {
    case "snapshot":
      return message.state;
    case "turnStarted":
      return updateTab(state, message.tabKey, (tab) => {
        if (
          tab.streaming !== null ||
          message.turnId === message.userTurn.id ||
          tab.turns.some((turn) => turn.id === message.turnId || turn.id === message.userTurn.id)
        ) {
          return tab;
        }
        return {
          ...clearTabError(tab),
          turns: [...tab.turns, message.userTurn],
          streaming: {
            id: message.turnId,
            text: "",
            model: message.model,
            at: message.at,
          },
        };
      });
    case "chunk":
      return updateTab(state, message.tabKey, (tab) => {
        if (tab.streaming?.id !== message.turnId || message.text === "") return tab;
        return {
          ...tab,
          streaming: { ...tab.streaming, text: tab.streaming.text + message.text },
        };
      });
    case "turnEnded":
      return updateTab(state, message.tabKey, (tab) => {
        if (tab.streaming?.id !== message.turnId) return tab;
        const assistant: AssistantTurn = {
          ...tab.streaming,
          role: "assistant",
          status: message.status,
          ...(message.usage === undefined ? {} : { usage: message.usage }),
          ...(message.error === undefined ? {} : { error: message.error }),
        };
        return { ...tab, turns: [...tab.turns, assistant], streaming: null };
      });
    case "error":
      return message.tabKey === undefined
        ? state.globalError === message.message
          ? state
          : { ...state, globalError: message.message }
        : updateTab(state, message.tabKey, (tab) =>
            tab.error === message.message ? tab : { ...tab, error: message.message },
          );
  }
}

export function dismissError(state: UiState, tabKey?: TabKey): UiState {
  if (tabKey !== undefined) return updateTab(state, tabKey, clearTabError);
  const { globalError, ...rest } = state;
  return globalError === undefined ? state : rest;
}

function clearTabError(tab: TabView): TabView {
  const { error, ...rest } = tab;
  return error === undefined ? tab : rest;
}

function updateTab(state: UiState, tabKey: TabKey, update: (tab: TabView) => TabView): UiState {
  const index = state.tabs.findIndex((tab) => tab.key === tabKey);
  const previous = state.tabs[index];
  if (previous === undefined) return state;
  const next = update(previous);
  if (next === previous) return state;
  const tabs = [...state.tabs];
  tabs[index] = next;
  return { ...state, tabs };
}
