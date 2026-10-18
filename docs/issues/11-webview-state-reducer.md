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

## Implementation tasks
- [ ] `src/core/ui/state.ts` (types), `reducer.ts`, `selectors.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#09

## Labels
`feature`

## Estimate
S
