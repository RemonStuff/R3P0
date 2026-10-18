# 38: Budget header per tab, and tab warning markers

**Iteration:** 5 (Budget visibility)

## Description
Each repo tab gets a header: the subject (`RemonStuff/Q0T4`), a progress bar for the weekly budget, "112k / 150k this week · resets Mon", and a warning state (theme colours `--vscode-editorWarning-foreground` and `--vscode-errorForeground`). The tab strip shows a small ⚠ or ⛔ marker on tabs in the warning or exhausted state, and the header has the New conversation button (#27). Values come from `budgetView`.

## Tests to write first
*(DOM)*
- `header shows the subject, the used/budget label and the reset label`
- `the progress bar has role=progressbar with aria-valuenow = percent`
- `warning level adds the warning class and the tab shows ⚠`
- `exhausted level adds the error class and the tab shows ⛔`
- `unknown level shows "Budget unavailable" without a bar`
- `a stale view shows a "may be out of date" hint`

*(unit: reducer)*
- `a budget message updates only the views it contains`

## Implementation tasks
- [ ] `src/webview/view/budgetHeader.ts`, tab markers in `tabStrip.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#36, #37

## Labels
`feature`

## Estimate
S
