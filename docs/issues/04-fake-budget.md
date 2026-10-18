# 04: `FakeBudget` and the shared `BudgetPort` contract suite

**Iteration:** 0 (Test harness)

## Description
`FakeBudget` is the most important test double. It's what lets R3P0 be built and tested **before Q0T4's API exists** (Q0T4 builds it in its iteration 9). It implements `BudgetPort` with scripted streams, Q0T4's refusal codes (`over-budget`, `blocked`, `no-prices`, `needs-reserve-approval`), `wouldBorrow`, **reserve grants per subject and week** (the way Q0T4 #57 works), mid-stream budget stops, usage events and availability states (including an API version mismatch). It also adds `test/contract/budgetPortContract.ts`, a suite that #30 later runs against the real adapter too.

## Tests to write first
*(`test/fakes/fakeBudget.test.ts`)*
- `send streams the scripted chunks in order`
- `send resolves outcome complete with the scripted cost, unit and borrowed`
- `send stops yielding and resolves stopped-by-user when the signal aborts`
- `send ends early with outcome stopped-by-budget after chunk n when scripted`
- `send rejects with each scripted refusal code before the first chunk`
- `send throws mid-stream after chunk n when an error is scripted`
- `check returns the scripted decisions in order: allowed, allowed with wouldBorrow, refused with a code`
- `in ask mode, check and send refuse with needs-reserve-approval until allowReserve(subject)`
- `a reserve grant applies to that subject only`
- `a reserve grant expires when FixedClock passes the week's reset`
- `status returns the scripted snapshot`
- `emitUsageChanged notifies onDidChangeUsage listeners with { subject, source, cost }`
- `setAvailability notifies onDidChangeAvailability and availability() returns the new state`
- `records every check, send and allowReserve call`
- `chunk delays use the injected FixedClock` (no real timers)

*(`test/contract/budgetPortContract.ts`, run here against FakeBudget)*
- `contract: a completed send yields all text then resolves outcome`
- `contract: aborting the signal ends the stream and resolves stopped-by-user`
- `contract: a budget stop is not a rejection`
- `contract: a refusal rejects before any chunk with its code`
- `contract: after allowReserve, needs-reserve-approval no longer refuses that subject this week`

## Implementation tasks
- [ ] `test/fakes/fakeBudget.ts`, declared `satisfies BudgetPort`
- [ ] `test/contract/budgetPortContract.ts`, exporting `budgetPortContract(name, makePort)`
- [ ] `test/fakes/index.ts` barrel export

## Acceptance criteria
- [ ] All the listed tests pass, and typecheck proves FakeBudget matches BudgetPort
- [ ] README.md updated

## Depends on
#02, #03

## Labels
`test`

## Estimate
M
