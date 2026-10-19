import type { Transcript, UiState } from "./state";

export function selectTranscript(state: UiState): Transcript {
  void state;
  return { turns: [], streaming: null };
}

export function isInputEnabled(state: UiState): boolean {
  void state;
  return false;
}
