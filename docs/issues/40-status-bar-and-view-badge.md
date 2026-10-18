# 40: Status bar summary and view badge

**Iteration:** 5 (Budget visibility) 🎯 **Install and try**

## Description
Q0T4 already has its own status bar item, so R3P0's is a **summary**: `$(comment-discussion) R3P0 ⚠ 2 ⛔ 1` (only non-zero counts, and just "R3P0" when everything is fine, or "R3P0: Q0T4 unavailable"). Clicking it runs `r3p0.showOverview`. The tooltip lists each repo's weekly label. The view's `badge` shows the number of exhausted repos. Text and state are computed in pure core.

## Tests to write first
*(unit: `test/unit/format/statusBar.test.ts`)*
- `all ok gives "R3P0" with no counts`
- `counts warning and exhausted repos, deduplicating shared subjects`
- `unavailable gives "R3P0: Q0T4 unavailable" with the error background`
- `the tooltip lists every repo's weekly label`
- `badge is the exhausted count, or undefined when zero`

*(integration)*
- `the status bar item exists and runs r3p0.showOverview`

## Implementation tasks
- [ ] `src/core/format/statusBar.ts`
- [ ] `UiPort.setStatusBar` / `setBadge` in `vscodeUi`
- [ ] Update `docs/manual-testing.md` for iteration 5

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: with Q0T4 installed, the tab headers, the Overview (weekly, monthly share, pace, reserve) and the status bar all update live while chatting from R3P0 and from `@q0t4`

## Depends on
#38, #39

## Labels
`feature`

## Estimate
S
