# 37: Budget display state

**Iteration:** 5 (Budget visibility)

## Description
`budgetView(subjectStatus, unit, clock)` turns Q0T4's status into what the UI shows, in pure core: `{ usedLabel: "112k", budgetLabel: "150k", percent: 75, level: "ok" | "warning" | "exhausted" | "unknown", resetsLabel: "resets Mon", stale }`.

The level comes from a per-subject state if Q0T4's `StatusSnapshot` provides one (asked in R1). Until then it's `exhausted` when `weeklyUsed ≥ weeklyBudget`, and `warning` at 80% (Q0T4's default `warnAtPercent`). `overviewRows(snapshot)` builds one row per open repo plus a reserve row:
- each repo: weekly used/budget, cycle used/monthly share, and **pace ×** as Q0T4 reports it (§9.4). It's flagged at ≥ 1.5×, Q0T4's default `monthlyPaceWarning`, and "default" when the budget isn't configured
- the reserve: size, borrowed, remaining
- the cycle window and the price table's date and source, with a stale-prices hint

## Tests to write first
*(`test/unit/budget/budgetView.test.ts`, `overviewRows.test.ts`)*
- `formats tokens as 112k / 1.2M and credits with the credits unit label`
- `percent is rounded and capped at 100 for display`
- `level follows a per-subject state when the snapshot has one`
- `without a state: exhausted at used >= budget, warning at 80%, otherwise ok`
- `an unknown or missing status gives level unknown with "Budget unavailable"`
- `resetsLabel uses the user's time zone (FixedClock with Europe/Amsterdam, across DST)`
- `stale values are flagged`
- `overview has one row per open subject, deduplicated, in tab order`
- `monthly columns are empty when Q0T4 is not in pool mode`
- `pace is shown as Q0T4's ratio (1.2×) and flagged at 1.5× or more`
- `a subject on the default budget is marked default`
- `reserve row shows size, borrowed and remaining`
- `stale prices in the snapshot produce a hint with the table date`

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
