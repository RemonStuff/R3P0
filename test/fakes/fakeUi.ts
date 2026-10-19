import type { StatusBarState, UiPort } from "../../src/ports/UiPort";

/** Records every UI call so tests can assert on them. */
export class FakeUi implements UiPort {
  readonly statusBar: StatusBarState[] = [];
  readonly openedExtensions: string[] = [];
  readonly openedSettings: string[] = [];
  readonly copied: string[] = [];
  readonly openedLinks: string[] = [];
  readonly errors: string[] = [];

  get lastStatusBar(): StatusBarState | undefined {
    return this.statusBar.at(-1);
  }

  setStatusBar(state: StatusBarState): void {
    this.statusBar.push({ ...state });
  }

  async openExtension(id: string): Promise<void> {
    this.openedExtensions.push(id);
  }

  async openSettings(query: string): Promise<void> {
    this.openedSettings.push(query);
  }

  async copy(text: string): Promise<void> {
    this.copied.push(text);
  }

  async openExternal(href: string): Promise<void> {
    this.openedLinks.push(href);
  }

  showError(text: string): void {
    this.errors.push(text);
  }
}
