/**
 * Key-value storage for chat history and UI state. Implemented by
 * `adapters/workspaceStateHistory` over `ExtensionContext.workspaceState` (#28).
 * Values are untrusted when read back; core validates them (#25).
 */
export interface ChatHistoryPort {
  get(key: string): unknown;
  set(key: string, value: unknown): Promise<void>;
  keys(): readonly string[];
}
