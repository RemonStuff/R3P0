import type { HostMessage } from "../protocol/messages";
import type { TabKey } from "../types";
import type { UiState } from "./state";

export function reduce(state: UiState, message: HostMessage): UiState {
  void message;
  return state;
}

export function dismissError(state: UiState, tabKey?: TabKey): UiState {
  void tabKey;
  return state;
}
