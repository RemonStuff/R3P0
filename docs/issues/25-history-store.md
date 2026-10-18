# 25: Chat history store (schema v1)

**Iteration:** 3 (The chat experience)

## Description
`HistoryStore` over `ChatHistoryPort` saves one conversation per tab under `r3p0.history.v1:<tabKey>` ([PLAN §5.2](../PLAN.md#52-chat-history-workspacestate)). `parseHistory` validates the stored value. A corrupt value is moved to `r3p0.history.corrupt.<timestamp>` and treated as empty, and it never throws. Caps: `r3p0.history.maxTurns` (default 100) and 512 kB, dropping the oldest turns first and always keeping user/assistant pairs together. Attachments are stored as `{ path, bytes }` only. On load, a turn that was still `streaming` becomes `interrupted`. Writes happen after each turn ends, and a failed write is reported once per tab and doesn't break the chat.

## Tests to write first
*(`test/unit/history/historyStore.test.ts`, using InMemoryHistory and FixedClock)*
- `load returns an empty conversation for a new tab`
- `save then load round-trips a conversation`
- `a corrupt value is quarantined under r3p0.history.corrupt.<timestamp> and load returns empty`
- `a value with an unknown version is quarantined, not migrated silently`
- `a turn saved as streaming loads as interrupted`
- `caps drop the oldest turn pairs beyond maxTurns`
- `caps drop the oldest turn pairs beyond 512 kB`
- `attachments are stored as path and bytes, never content`
- `a failed write is reported once and the in-memory conversation is kept`
- `keys for two tabs never collide` (keys that differ only in case on Windows paths)

## Implementation tasks
- [ ] `src/core/history/schema.ts`, `parseHistory.ts`, `caps.ts`, `historyStore.ts`
- [ ] Setting `r3p0.history.maxTurns`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#05

## Labels
`feature`

## Estimate
M
