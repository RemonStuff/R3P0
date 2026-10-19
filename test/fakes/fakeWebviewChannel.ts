import type { WebviewChannelPort } from "../../src/ports/WebviewChannelPort";
import { Emitter } from "./emitter";

/**
 * The webview side of the channel, driven by the test: `receive` injects raw
 * messages as if the webview sent them, `posted` holds what the host sent.
 * Like a real hidden webview, posts while hidden are lost and resolve `false`.
 */
export class FakeWebviewChannel<Out> implements WebviewChannelPort<Out> {
  posted: Out[] = [];
  private shown = true;
  private readonly messages = new Emitter<unknown>();
  private readonly visibility = new Emitter<boolean>();
  readonly onMessage = this.messages.event;
  readonly onDidChangeVisibility = this.visibility.event;

  get visible(): boolean {
    return this.shown;
  }

  async post(message: Out): Promise<boolean> {
    if (!this.shown) return false;
    this.posted.push(message);
    return true;
  }

  receive(raw: unknown): void {
    this.messages.fire(raw);
  }

  setVisible(visible: boolean): void {
    if (visible === this.shown) return;
    this.shown = visible;
    this.visibility.fire(visible);
  }

  takePosted(): Out[] {
    const posted = this.posted;
    this.posted = [];
    return posted;
  }
}
