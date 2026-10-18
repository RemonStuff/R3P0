# 10: `ChatSession` core: send, stream, finish and fail

**Iteration:** 1 (Walking skeleton)

## Description
A `ChatSession` owns one repo's conversation and drives one request at a time through `BudgetPort`: `idle → sending → streaming → idle`. It emits host messages (`turnStarted`, `chunk`, `turnEnded`) to a sink. Chunks are coalesced by a `ChunkBatcher`, which flushes every 50 ms or 2 KB on `ClockPort`, so the webview isn't flooded. History, models and budget pre-checks come later. Here the session sends the conversation's turns as plain messages, using a fixed model ref from its constructor.

## Tests to write first
*(`test/unit/chat/chatSession.test.ts`, using FakeBudget and FixedClock)*
- `send appends a user turn and an assistant turn and posts turnStarted`
- `streamed chunks are batched: three chunks within 50 ms produce one chunk message`
- `a batch flushes early when it reaches 2 KB`
- `turnEnded carries status complete and the cost from the outcome`
- `a second send while streaming is ignored` (one request in flight per tab)
- `a rejection before the first chunk ends the turn as failed with the error message`
- `an error mid-stream keeps the partial text and ends the turn as failed`
- `outcome stopped-by-budget ends the turn as stopped-by-budget, not failed`
- `send passes the subject, model ref and messages to BudgetPort.send`
- `the assistant text equals the concatenation of all chunks` (property-style test over random chunkings)

*(`test/unit/chat/chunkBatcher.test.ts`)*
- `flushes after 50 ms of FixedClock time`
- `flush() on end emits the remainder immediately`
- `no timer remains after dispose`

## Implementation tasks
- [ ] `src/core/chat/chunkBatcher.ts`
- [ ] `src/core/chat/chatSession.ts`
- [ ] Run `budgetPortContract`-style assertions through the session where it helps

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#04, #05, #09

## Labels
`feature`

## Estimate
M
