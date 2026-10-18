import type { Disposable } from "./Disposable";

/**
 * Cancellation as core sees it. `vscode.CancellationToken` satisfies this
 * structurally; the Q0T4 adapter links it to a real token source.
 */
export interface CancellationSignal {
  readonly isCancellationRequested: boolean;
  onCancellationRequested(listener: () => void): Disposable;
}
