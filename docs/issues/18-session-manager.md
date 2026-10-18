# 18: `SessionManager`: one session per tab

**Iteration:** 2 (One tab per repo)

## Description
`SessionManager` keeps a `ChatSession` per tab key, created and removed following `reconcileTabs`, and routes protocol messages by `tabKey`. Removing a tab **cancels** its in-flight request (with the outcome `stopped-by-user`, so the cost Q0T4 reports is still recorded) and disposes the session. It tracks the active tab (`selectTab`). If the active tab is removed, the neighbour to its left (or Overview) becomes active. Changing a tab's subject applies to the next request, never to one already in flight.

## Tests to write first
*(`test/unit/chat/sessionManager.test.ts`)*
- `creates a session for every repo tab`
- `routes send to the session for its tabKey`
- `send for an unknown tabKey is ignored and logged`
- `removing a tab cancels its in-flight request and disposes the session`
- `removing the active tab selects its left neighbour`
- `removing the last repo tab selects Overview`
- `a subject change does not affect a request already in flight`
- `two tabs can stream at the same time, independently`
- `selectTab for an unknown key keeps the current active tab`

## Implementation tasks
- [ ] `src/core/chat/sessionManager.ts`
- [ ] Hook it into `controller`, replacing the single session from #14

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#10, #16

## Labels
`feature`

## Estimate
M
