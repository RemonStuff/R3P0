import type { TabView, ViewState } from "../protocol/messages";

export interface UiState extends ViewState {
  readonly globalError?: string;
}

export type Transcript = Pick<TabView, "turns" | "streaming">;

export function createInitialState(): UiState {
  return { tabs: [], activeTab: null, availability: { state: "missing" } };
}
