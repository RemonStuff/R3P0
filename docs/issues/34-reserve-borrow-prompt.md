# 34: Reserve prompt: "Allow reserve for ‹repo› this week"

**Iteration:** 4 (Q0T4 integration)

## Description
Q0T4's `reserveMode` defaults to `"ask"` (Q0T4 §9.3). When a request doesn't fit a repo's weekly budget, Q0T4 refuses with `needs-reserve-approval`, either from `canSpend` or as a rejection of `sendRequest`. R3P0 then doesn't send. Instead it shows an inline prompt in that tab: "RemonStuff/Q0T4 has used its weekly budget. Allow it to borrow from the reserve for the rest of this week?", with **Allow reserve for Q0T4 this week** and **Cancel**.

**Allow** runs `BudgetPort.allowReserve(subject)` (Q0T4's `q0t4.allowReserve` command, see #30). Then it re-sends **that** request. The grant lasts for that subject for the rest of the week (Q0T4 #57), so later requests on the repo, and on other tabs with the same subject, borrow without asking. Each prompt has a `requestId`, so a stale or duplicate click is ignored. **Cancel** puts the prompt text back in the composer. Under `"auto"`, Q0T4 borrows without asking, and R3P0 shows a "borrowed N from the reserve" note on the turn (from `wouldBorrow` and `result.borrowed`).

## Tests to write first
*(unit: `test/unit/chat/reserve.test.ts`)*
- `needs-reserve-approval from check posts a reservePrompt with a requestId and the subject`
- `needs-reserve-approval from send (race after an allowed check) also posts the prompt`
- `allowReserve with the matching requestId grants the subject and re-sends the same request`
- `allowReserve with a stale requestId is ignored`
- `a double allow grants and sends once`
- `when the grant fails (command missing), the tab shows "Open Q0T4 to allow the reserve" and does not send`
- `declineReserve sends nothing and restores the prompt text to the composer`
- `after a grant, the next request on the same subject is sent without a prompt` (FakeBudget grant per week)
- `a grant on one tab also applies to another tab with the same subject`
- `starting another send on the tab cancels a pending prompt`
- `wouldBorrow or borrowed > 0 adds a "borrowed from the reserve" note to the turn`

*(DOM)*
- `the reserve prompt shows the subject and both buttons`
- `Allow posts allowReserve with the requestId; Cancel posts declineReserve`

*(integration)*
- `the fake Q0T4 in ask mode refuses, the fake q0t4.allowReserve command records the subject, and the re-send succeeds`

## Implementation tasks
- [ ] Protocol: `reservePrompt`, `allowReserve`, `declineReserve` (with parser tests)
- [ ] `src/core/chat/reserve.ts`, `src/webview/view/reservePrompt.ts`
- [ ] A fake `q0t4.allowReserve` command in `test/fixtures/fake-q0t4`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] README.md updated

## Depends on
#33

## Labels
`feature`

## Estimate
M
