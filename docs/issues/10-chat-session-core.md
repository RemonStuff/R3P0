# 10: `ChatSession` core: send, stream, finish and fail

**Iteration:** 1 (Walking skeleton)

## Description
A `ChatSession` owns one repo's conversation and drives one request at a time through `BudgetPort`: `idle → sending → streaming → idle`. It emits host messages (`turnStarted`, `chunk`, `turnEnded`) to a synchronous sink. Chunks are coalesced by a `ChunkBatcher`, which flushes 50 ms after the first buffered text or at 2,048 UTF-8 bytes on `ClockPort`, so the webview isn't flooded. This is a flush trigger, not a hard message-size cap; large chunks are not split. History, model selection and budget pre-checks come later. Here the session sends the conversation's turns as plain messages, using a fixed model ref from its constructor.

## Tests to write first
*(`test/unit/chat/chatSession.test.ts`, using FakeBudget and FixedClock)*
- `send appends a user turn and an assistant turn and posts turnStarted`
- `streamed chunks are batched: three chunks within 50 ms produce one chunk message`
- `a batch flushes early when it reaches 2,048 UTF-8 bytes`
- `turnEnded carries status complete and the cost from the outcome`
- `a second send while streaming is ignored` (one request in flight per tab)
- `a rejection before the first chunk ends the turn as failed with the error message`
- `an error mid-stream keeps the partial text and ends the turn as failed`
- `outcome stopped-by-budget ends the turn as stopped-by-budget, not failed`
- `send passes the subject, model ref and messages to BudgetPort.send`
- `the assistant text equals the concatenation of all chunks` (property-style test over random chunkings)
- `the busy gate also covers sending, awaiting the outcome and reentrant notifications`
- `snapshots expose partial text and cannot mutate the session`
- `cancellation preserves stopped-by-user and reported usage`
- `two sessions send independently`
- `invalid prompts fail before any turns or budget calls`
- `iterator errors preserve partial text and usage, even with a contradictory complete outcome`
- `a failed outcome without usage does not invent a zero cost`
- `delivery errors reject send without escaping a timer callback or losing the actual metered outcome`

*(`test/unit/chat/chunkBatcher.test.ts`)*
- `flushes after 50 ms of FixedClock time`
- `flush() on end emits the remainder immediately`
- `no timer remains after dispose`
- `49 ms does not flush, and later text does not reset the 50 ms deadline`
- `2,047 bytes does not flush, and 2,048 bytes does`
- `UTF-8 counting uses the joined buffer, including split surrogate pairs`
- `oversized chunks, whitespace and Unicode remain unchanged`
- `empty inputs, repeated flushes, disposal and reentrant sinks leave no stale timer`

## Core API and local evidence

See [PLAN §3.3](../PLAN.md#33-single-session-core-10) for constructor options, `send`, `snapshot`, cancellation ownership, batching and error handling. This issue does not change the installed placeholder.

The local red checkpoint is `e0e8bc9`: the focused tests had **76 expected failures and 2 passes**, with typechecks, lint and formatting passing. An additional delivery regression then reproduced both an escaping timer error and lost reported usage: **2 expected failures and 2 passes** in the sink-failure selector. Both were fixed before the final green run. The final focused suite has **79 passing tests**; the full unit/DOM suite has **364 passing tests**, with **100% core line coverage and 96.49% branch coverage**. Publication and hosted CI remain pending.

Local validation also passed all **22 real VS Code integration tests** (11 with fake Q0T4 v1, 6 without Q0T4 and 5 with fake Q0T4 v2), lint, all three TypeScript checks, formatting, production VSIX packaging and source/history secret scans. No real model or Q0T4 request was made.

## Implementation tasks
- [x] `src/core/chat/chunkBatcher.ts`
- [x] `src/core/chat/chatSession.ts`
- [x] Run `budgetPortContract`-style assertions through the session where it helps

## Acceptance criteria
- [x] The listed tests pass and core line/branch coverage is ≥ 90%
- [ ] Hosted CI is green on the published head

## Depends on
#04, #05, #09

## Labels
`feature`

## Estimate
M
