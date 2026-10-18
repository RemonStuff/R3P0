# 36: Wire Q0T4 as the budget

**Iteration:** 4 (Q0T4 integration) 🎯 **Install and try**

## Description
Make the locator's `Q0T4Budget` the `BudgetPort` used by every tab. `SimulatedBudget` is now selectable **only** in `ExtensionMode.Development` or `Test` (the setting is ignored in an installed `.vsix`). Wire the unavailable banner, refusals, the borrow prompt and live refresh. End the iteration with a manual check against a **real Q0T4 `.vsix`** once Q0T4's API ships (if it hasn't shipped, record that and run the checklist against the fake Q0T4 installed as a `.vsix`).

## Tests to write first
*(unit: composition helper `chooseBudget(mode, setting, locator)`)*
- `production mode always uses the Q0T4 budget, even with the simulated setting on`
- `development mode with the setting on uses SimulatedBudget`

*(integration, `with-q0t4`)*
- `a send streams through the fake Q0T4 and records its subject and ModelRef`
- `a scripted refusal disables the tab's input`
- `a scripted usage event updates the tab's budget view within 1 s`
- `the borrow flow sends approveBorrow after approval`

## Implementation tasks
- [ ] `src/core/chooseBudget.ts`, and wiring in `extension.ts`
- [ ] Update `docs/manual-testing.md` for iteration 4, including the real-Q0T4 checklist

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: without Q0T4, R3P0 explains why and Show Q0T4 works. With Q0T4, a chat in each tab is metered against that repo, a spent repo's input is disabled, `"ask"` shows the borrow button, and using `@q0t4` in Copilot Chat updates R3P0's tabs live

## Depends on
#32, #33, #34, #35

## Labels
`feature`

## Estimate
S
