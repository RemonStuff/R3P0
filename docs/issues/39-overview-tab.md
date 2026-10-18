# 39: Overview tab

**Iteration:** 5 (Budget visibility)

## Description
The first tab, **Overview**, shows a table with one row per open repo (weekly used/budget with a bar, monthly share, pace) and the **reserve** (size, borrowed, remaining), plus the cycle dates when Q0T4 is in pool mode. Clicking a row selects that repo's tab. When Q0T4 is unavailable, it shows the banner from #32 instead. With no folders open, it says "Open a folder or workspace to get a chat per repo."

## Tests to write first
*(DOM)*
- `renders one row per repo in tab order with the weekly label and bar`
- `renders monthly share and pace columns only in pool mode`
- `renders the reserve row with size, borrowed and remaining`
- `shows the cycle start and end in pool mode`
- `clicking a row posts selectTab with that repo's key`
- `rows are keyboard reachable and Enter selects`
- `with no repos, shows the open-a-folder hint`
- `with Q0T4 unavailable, shows the banner instead of the table`

*(unit: controller)*
- `the overview is included in the snapshot and refreshed with each budget update`

## Implementation tasks
- [ ] `src/webview/view/overview.ts`
- [ ] Command `r3p0.showOverview` (focus the view and select Overview)

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#36, #37

## Labels
`feature`

## Estimate
M
