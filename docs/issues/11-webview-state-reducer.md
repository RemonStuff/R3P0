# 11: Webview UI state reducer (`core/ui`)

**Iteration:** 1 (Walking skeleton)

## Description
The webview's state logic is a pure reducer in `src/core/ui` (so the core coverage gate covers it), imported by the webview bundle: `reduce(state, hostMessage) → state`, plus selectors for the active tab's transcript and whether the input is enabled. Applying a `snapshot` replaces the whole state. `chunk` appends to the streaming turn. A `chunk` for an unknown turn is ignored, and the next snapshot fixes it.

## Tests to write first
*(`test/unit/ui/reducer.test.ts`)*
- `initial state has no tabs and input disabled`
- `snapshot replaces the whole state`
- `turnStarted adds the user turn and an empty streaming assistant turn`
- `chunk appends text to the streaming assistant turn`
- `chunk for an unknown turnId is ignored`
- `turnEnded sets the status and clears streaming`
- `input is disabled while the active tab is streaming`
- `error sets a dismissible error banner for the tab`
- `the reducer never mutates the previous state` (frozen input)
- `snapshot restores partial streaming text and replaces stale selection, availability and errors`
- `unknown tabs, overlapping starts, reused IDs, late chunks and repeated completion are no-ops`
- `updates remain tab-scoped even when two tabs use the same turn ID`
- `every terminal status preserves partial text, model, timestamp and optional usage/error`
- `unscoped errors become global banners, including before the first snapshot`
- `dismissing a banner preserves other banners and failed-turn history`
- `input requires a matching active tab, ready availability and no streaming turn`
- `actual ChatSession messages produce the same transcript as the session snapshot`

## API and behavior

See [PLAN §3.4](../PLAN.md#34-webview-ui-state-11) for the full contract. Reuse the existing protocol types; do not add host message types or a protocol version.

- `createInitialState(): UiState` starts empty and unavailable. `UiState` adds only an optional local `globalError` to `ViewState`.
- `reduce(state, hostMessage): UiState` applies validated host messages with immutable updates. A snapshot replaces the whole projection. Stale incremental updates are ignored until a fresh snapshot.
- `dismissError(state, tabKey?): UiState` clears only the named tab banner, or the global banner without a key. This is a local UI operation, not a host message.
- `selectTranscript(state)` returns `{ turns, streaming }`; no completed status is invented for a streaming assistant reply.
- `isInputEnabled(state)` requires ready availability, a matching active tab and no stream. Errors alone do not disable retry, and ready-but-degraded availability remains usable.

Chunk text is appended exactly, including repeated adjacent text. Snapshot/batched-chunk coordination belongs to the #14 controller; it must not replay a prefix already included in a snapshot.

This issue does not wire the message pump, render DOM, discover repositories or call a model. The installed extension remains a placeholder.

## Local test-first evidence

Red checkpoint `deff3cd`: `npm test -- test/unit/ui/reducer.test.ts` produced **40 expected assertion failures and 28 passes** against typed scaffolds. Types, lint, formatting and new-source secret scans passed at red. No missing imports or type failures were used as the red result.

After implementation, **all 68 focused tests passed**. The full unit/DOM suite passed **442 tests**, with **100% core line coverage and 97.48% branch coverage**. All three new UI modules have **100% line coverage**, and both modules with branches have **100% branch coverage**. Inputs are deeply frozen in the reducer tests; real session sequences use only `FakeBudget`, `FakeCancellation` and `FixedClock`.

Local validation is window-free. Real VS Code integration testing remains in hosted Linux CI after separately approved publication. Local results do not replace exact-head hosted execution or artifact verification.

## Implementation tasks
- [x] `src/core/ui/state.ts` (types), `reducer.ts`, `selectors.ts`
- [x] Frozen-input, selector, error dismissal and real-session projection tests

## Acceptance criteria
- [x] The listed tests pass and core line/branch coverage is ≥ 90%
- [ ] Hosted CI is green on the published head, including real VS Code tests and the packaged artifact

## Depends on
#09

## Labels
`feature`

## Estimate
S
