# 04: `FakeBudget` and the shared `BudgetPort` contract suite

**Iteration:** 0 (Test harness)

## Description
`FakeBudget` is the most important test double. It's what lets R3P0 be built and tested **before Q0T4's API exists**. It implements `BudgetPort` with scripted streams, check decisions, refusals, borrow prompts, mid-stream budget stops, usage events and availability states (including an API version mismatch). It also adds `test/contract/budgetPortContract.ts`, a suite that #30 later runs against the real adapter too.

## Tests to write first
*(`test/fakes/fakeBudget.test.ts`)*
- `send streams the scripted chunks in order`
- `send resolves outcome complete with the scripted cost and unit`
- `send stops yielding and resolves stopped-by-user when the signal aborts`
- `send ends early with outcome stopped-by-budget after chunk n when scripted`
- `send rejects with a refused error before the first chunk when scripted`
- `send rejects with borrow-required unless approveBorrow is true`
- `send throws mid-stream after chunk n when an error is scripted`
- `check returns the scripted decisions in order: allowed, needs-borrow, refused`
- `status returns the scripted snapshot for the requested subjects only`
- `emitUsageChanged notifies onDidChangeUsage listeners with the given subjects`
- `setAvailability notifies onDidChangeAvailability and availability() returns the new state`
- `records every check and send call with subject, model, messages and approveBorrow`
- `chunk delays use the injected FixedClock` (no real timers)

*(`test/contract/budgetPortContract.ts`, run here against FakeBudget)*
- `contract: a completed send yields all text then resolves outcome`
- `contract: aborting the signal ends the stream and resolves stopped-by-user`
- `contract: a budget stop is not a rejection`
- `contract: a refusal rejects before any chunk`

## Implementation tasks
- [ ] `test/fakes/fakeBudget.ts`, declared `satisfies BudgetPort`
- [ ] `test/contract/budgetPortContract.ts`, exporting `budgetPortContract(name, makePort)`
- [ ] `test/fakes/index.ts` barrel export

## Acceptance criteria
- [ ] All the listed tests pass, and typecheck proves FakeBudget matches BudgetPort

## Depends on
#02, #03

## Labels
`test`

## Estimate
M
