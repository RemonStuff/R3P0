# 34: Reserve borrow prompt (`reserveMode: "ask"`)

**Iteration:** 4 (Q0T4 integration)

## Description
When Q0T4's `reserveMode` is `"ask"` and `check` returns `needs-borrow` (or `sendRequest` rejects with `borrow-required`), R3P0 doesn't send. It shows an inline prompt in the tab: "RemonStuff/Q0T4 needs ~2.1k more than its weekly budget. Borrow from the reserve (18k left)?" with **Approve borrow** and **Cancel** buttons. Each prompt has a `requestId`. Approve re-sends **that** request with `approveBorrow: true`. A stale or duplicate click is ignored. Cancel restores the prompt text to the composer. Approval applies to that one request only.

## Tests to write first
*(unit: `test/unit/chat/borrow.test.ts`)*
- `needs-borrow posts a borrowPrompt with a requestId and labels`
- `approveBorrow with the matching requestId sends with approveBorrow true`
- `approveBorrow with a stale requestId is ignored`
- `a double approve sends once`
- `declineBorrow sends nothing and restores the prompt text to the composer`
- `the next request after an approved one checks again (approval is not sticky)`
- `a borrow-required rejection from sendRequest also shows the prompt`
- `with reserveMode off, needs-borrow is never shown` (treated as refused)
- `starting another send on the tab cancels a pending prompt`

*(DOM)*
- `the borrow prompt shows the amounts and both buttons`
- `Approve posts approveBorrow with the requestId; Cancel posts declineBorrow`

*(integration)*
- `the fake Q0T4 in ask mode receives approveBorrow: true only after approve`

## Implementation tasks
- [ ] Protocol: `borrowPrompt`, `approveBorrow`, `declineBorrow` (with parser tests)
- [ ] `src/core/chat/borrow.ts`, `src/webview/view/borrowPrompt.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#33

## Labels
`feature`

## Estimate
M
