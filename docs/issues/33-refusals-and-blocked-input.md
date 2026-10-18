# 33: Budget refusals and the blocked input

**Iteration:** 4 (Q0T4 integration)

## Description
Before every send, the session calls `BudgetPort.check` (Q0T4's `canSpend`, with R3P0's input estimate). A refusal means no request is made, and the tab shows a message per Q0T4 code (Q0T4 #64), formatted in `core/format` with `ClockPort` in the user's time zone:
- `over-budget`: "RemonStuff/Q0T4 has used its weekly budget: 150k / 150k. It resets Mon 19 Oct." (the figures come from the refusal details if present, else from the last status, R2)
- `blocked` (`unallocatedSubjects: "block"`): "Q0T4 has no budget for RemonStuff/Q0T4.", plus **Open Q0T4 settings**
- `no-prices` (credits mode, no price table yet): "Q0T4 has no model prices yet.", plus **Refresh model prices** (the command from R4, else Open Q0T4 settings)
- `needs-reserve-approval` is handled by #34

 When `status` reports a subject as `exhausted`, that tab's **input is disabled** with the same explanation, before the user even types. A mid-stream cut-off (`stopped-by-budget`) shows "⛔ Stopped: weekly budget reached". The input re-enables when an `onDidChangeUsage` refresh reports the subject as no longer exhausted.

## Tests to write first
*(unit: `test/unit/budget/refusal.test.ts`, `chatSession.test.ts`)*
- `check refused: no send happens and a refusal turn is shown`
- `refusal text shows used, budget and the reset date in the user's time zone`
- `refusal text uses credits formatting when unit is credits`
- `over-budget without details falls back to the last status figures`
- `blocked shows the no-budget text and an Open Q0T4 settings action`
- `no-prices shows the no-prices text and a refresh action`
- `an unknown refusal code shows "Q0T4 refused: <message>"`
- `check passes the estimated input tokens and the model name`
- `a sendRequest refusal (race after an allowed check) is shown the same way`
- `status exhausted disables that tab's input with the explanation`
- `status exhausted for one subject does not disable other tabs`
- `two tabs with the same subject are both disabled`
- `a usage change that un-exhausts the subject re-enables input`
- `stopped-by-budget shows the ⛔ note and keeps the partial text`

*(DOM)*
- `a disabled input shows the explanation as its placeholder and an aria-describedby note`

## Implementation tasks
- [ ] `src/core/format/refusal.ts`, `src/core/format/numbers.ts` (112k / 1.2M, the same style as Q0T4)
- [ ] Composer disabled state

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#28, #30

## Labels
`feature`

## Estimate
S
