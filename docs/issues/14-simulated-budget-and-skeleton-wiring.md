# 14: Simulated budget and wiring the walking skeleton

**Iteration:** 1 (Walking skeleton) 🎯 **Install and try**

## Description
Wire the first end-to-end path: the view → `controller` → one `ChatSession` (for the first workspace folder, or "No folder" when none is open) → `BudgetPort`. Q0T4's API doesn't exist yet, so the installable build uses a **`SimulatedBudget`** adapter. It implements `BudgetPort` **without touching any model**: it streams back "Simulated reply to: ‹prompt›" word by word and labels every turn `SIMULATED`. It's enabled with the setting `r3p0.dev.simulatedBudget` (default `false`). With the setting off, availability is `missing`, so sending is refused. That honours "never call a model directly" from day one. After #36, the setting only works in Development and Test mode.

The controller is pure core, and the test API exposes `{ channel, controller }`.

## Tests to write first
*(unit: `test/unit/controller.test.ts`, using FakeBudget, FakeWebviewChannel and FixedClock)*
- `ready posts a snapshot with one tab for the first repo`
- `send on the tab streams through BudgetPort and posts turnStarted, chunk and turnEnded`
- `a malformed message from the webview is dropped and logged, not thrown`
- `send while availability is missing posts an unavailable error and never calls BudgetPort.send`
- `ready during a stream posts a snapshot that includes the partial text`

*(unit: `test/unit/budget/simulatedBudget.test.ts`, the adapter is pure)*
- `streams the simulated reply word by word on the clock`
- `outcome has cost 0 and is marked simulated`
- `honours stop`

*(integration, `with-q0t4` config, setting on)*
- `sending through the test API produces a complete simulated assistant turn`

## Implementation tasks
- [ ] `src/core/controller.ts`
- [ ] `src/core/budget/simulatedBudget.ts` (pure, used by the adapter wiring)
- [ ] `contributes.configuration`: `r3p0.dev.simulatedBudget`
- [ ] Wiring in `src/extension.ts`, and `systemClock` in `src/adapters`
- [ ] Update `docs/manual-testing.md` for iteration 1

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: install the `.vsix` and turn on `r3p0.dev.simulatedBudget`. Typing a message streams a SIMULATED reply. With the setting off, sending is refused with an explanation

## Depends on
#10, #12, #13

## Labels
`feature`

## Estimate
M
