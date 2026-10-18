import type { Disposable } from "./Disposable";

/**
 * The message channel to the webview. Implemented by `adapters/webviewViewChannel` (#13).
 * `Out` is the host-to-webview message type (#09). Incoming messages are `unknown`
 * and must go through the protocol parser.
 */
export interface WebviewChannelPort<Out> {
  /** Resolves `false` when the webview is hidden or gone; never rejects. */
  post(message: Out): Promise<boolean>;
  onMessage(listener: (raw: unknown) => void): Disposable;
  readonly visible: boolean;
  onDidChangeVisibility(listener: (visible: boolean) => void): Disposable;
}
