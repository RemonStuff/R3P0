# 37: Budget display state

**Iteration:** 5 (Budget visibility)

## Description
`budgetView(subjectStatus, unit, clock)` turns Q0T4's status into what the UI shows, in pure core: `{ usedLabel: "112k", budgetLabel: "150k", percent: 75, level: "ok" | "warning" | "exhausted" | "unknown", resetsLabel: "resets Mon", stale }`. The level comes from Q0T4's `state`. R3P0 never recomputes thresholds. `overviewRows(status)` builds one row per open repo (weekly used/budget, monthly share used/share, pace: `ahead | on track | behind` from `pace.expectedByNow` vs `pace.used`) plus a reserve row (`used / budget`, `reserveMode`).

## Tests to write first
*(`test/unit/budget/budgetView.test.ts`, `overviewRows.test.ts`)*
- `formats tokens as 112k / 1.2M and credits with the credits unit label`
- `percent is rounded and capped at 100 for display`
- `level follows Q0T4 state: ok, warning, exhausted`
- `an unknown or missing status gives level unknown with "Budget unavailable"`
- `resetsLabel uses the user's time zone (FixedClock with Europe/Amsterdam, across DST)`
- `stale values are flagged`
- `overview has one row per open subject, deduplicated, in tab order`
- `monthly columns are empty when Q0T4 is not in pool mode`
- `pace is ahead when used > expectedByNow * 1.1, behind when < 0.9, otherwise on track`
- `reserve row shows used / budget and reserveMode`

## Implementation tasks
- [ ] `src/core/budget/budgetView.ts`, `overviewRows.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#30

## Labels
`feature`

## Estimate
S
