import type { WebviewMessage } from "../../src/core/protocol/messages";

export class FakeVsCodeApi {
  readonly posted: WebviewMessage[] = [];
  readonly saved: { draft: string }[] = [];
  onPost: ((message: WebviewMessage) => void) | undefined;

  constructor(private state: unknown = undefined) {}

  postMessage(message: WebviewMessage): void {
    this.posted.push(structuredClone(message));
    this.onPost?.(message);
  }

  getState(): unknown {
    return structuredClone(this.state);
  }

  setState(state: { draft: string }): void {
    this.state = structuredClone(state);
    this.saved.push(structuredClone(state));
  }
}
