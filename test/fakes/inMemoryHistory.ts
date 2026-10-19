import type { ChatHistoryPort } from "../../src/ports/ChatHistoryPort";

/**
 * ChatHistoryPort backed by a Map. Values are deep-copied in and out, like
 * workspaceState's JSON round-trip; `failWrites` makes `set` reject.
 */
export class InMemoryHistory implements ChatHistoryPort {
  private readonly values = new Map<string, unknown>();
  private writeFailure: Error | undefined;

  constructor(seed: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, structuredClone(value));
  }

  get(key: string): unknown {
    return structuredClone(this.values.get(key));
  }

  async set(key: string, value: unknown): Promise<void> {
    if (this.writeFailure) throw this.writeFailure;
    if (value === undefined) this.values.delete(key);
    else this.values.set(key, structuredClone(value));
  }

  keys(): readonly string[] {
    return [...this.values.keys()];
  }

  /** Every `set` rejects with `error` until called again with `undefined`. */
  failWrites(error: Error | undefined): void {
    this.writeFailure = error;
  }
}
