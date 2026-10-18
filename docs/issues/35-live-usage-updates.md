# 35: Live updates through `onDidChangeUsage`

**Iteration:** 4 (Q0T4 integration)

## Description
All tabs stay current: on `onDidChangeUsage` (from R3P0's own requests, from `@q0t4` in Copilot Chat, or from another window), R3P0 refreshes `status(allSubjects)`, debounced by 250 ms on `ClockPort`, and posts `budget` to the webview. Only one refresh is in flight at a time, and a trigger during one schedules exactly one more. A refresh that fails keeps the last known values and marks them stale. While the view is hidden, refreshes are skipped, and one runs when it becomes visible again.

## Tests to write first
*(unit: `test/unit/budget/usageRefresher.test.ts`)*
- `a usage event triggers one status call after 250 ms`
- `five events within 250 ms trigger one status call`
- `an event during an in-flight refresh schedules exactly one more`
- `status is requested for every open tab's subject, deduplicated case-insensitively`
- `a failed refresh keeps the last values and marks them stale`
- `no refresh runs while the view is hidden; one runs when it becomes visible`
- `subject-specific events still refresh all subjects` (pool shares move together)

## Implementation tasks
- [ ] `src/core/budget/usageRefresher.ts`
- [ ] Protocol: `budget` (with parser tests)

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#30

## Labels
`feature`

## Estimate
S
