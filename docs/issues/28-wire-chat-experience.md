# 28: Wire the chat experience

**Iteration:** 3 (The chat experience) 🎯 **Install and try**

## Description
Wire everything from this iteration: the `workspaceStateHistory` adapter (`ChatHistoryPort` over `context.workspaceState`), the model catalog, `buildMessages` in front of every send, markdown, stop, new conversation and restore. After this, each tab is a full chat (still SIMULATED until iteration 4).

## Tests to write first
*(integration, `with-q0t4` config)*
- `workspaceStateHistory get/set/keys round-trip through context.workspaceState`
- `a sent message is saved under r3p0.history.v1:<tabKey>`
- `the fake Q0T4 receives the preamble, history and prompt as plain messages with the picked ModelRef`
- `stop through the test API ends the turn as stopped-by-user`

## Implementation tasks
- [ ] `src/adapters/workspaceStateHistory.ts`
- [ ] Wiring in `extension.ts`
- [ ] Update `docs/manual-testing.md` for iteration 3

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual (SIMULATED budget): markdown and code blocks render, Copy works, Stop works, the model picker lists your models, history survives *Developer: Reload Window*, and New conversation clears only that tab

## Depends on
#21, #22, #23, #24, #26, #27

## Labels
`feature`

## Estimate
S
