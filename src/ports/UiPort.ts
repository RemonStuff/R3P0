export interface StatusBarState {
  readonly text: string;
  readonly tooltip: string;
  readonly level: "normal" | "warning" | "error";
}

/** Editor UI outside the webview. Implemented by `adapters/vscodeUi` (#21, #32, #40). */
export interface UiPort {
  setStatusBar(state: StatusBarState): void;
  /** Opens an extension's page, e.g. "RemonStuff.q0t4". */
  openExtension(id: string): Promise<void>;
  openSettings(query: string): Promise<void>;
  copy(text: string): Promise<void>;
  /** Only ever called with http(s) URLs. */
  openExternal(href: string): Promise<void>;
  showError(text: string): void;
}
