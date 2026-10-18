# 23: Stop button and cancellation

**Iteration:** 3 (The chat experience)

## Description
While a tab is streaming, its Send button becomes **Stop**. Stop posts `stop { tabKey }`, and the session aborts the signal passed to `BudgetPort.send`. The turn ends as `stopped-by-user` with whatever text arrived, and the cost Q0T4 reports is kept. Escape in the composer also stops.

## Tests to write first
*(unit: `chatSession` / `sessionManager`)*
- `stop aborts the signal passed to BudgetPort.send`
- `after stop, the turn ends as stopped-by-user with the partial text`
- `the outcome cost reported after stop is kept on the turn`
- `stop when idle is a no-op`
- `stop on tab A does not affect a stream on tab B`
- `chunks that arrive after stop are not appended`

*(DOM)*
- `the Send button shows Stop while streaming and posts stop`
- `Escape in the composer posts stop while streaming`
- `a stopped turn shows a "Stopped" marker`

## Implementation tasks
- [ ] Protocol: `stop` (with parser tests)
- [ ] Session abort handling, and the composer button state

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#18

## Labels
`feature`

## Estimate
S
