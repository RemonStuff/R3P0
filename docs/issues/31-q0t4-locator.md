# 31: Q0T4 locator: find, activate and watch Q0T4

**Iteration:** 4 (Q0T4 integration)

## Description
The `q0t4Locator` adapter produces R3P0's availability. It calls `extensions.getExtension("RemonStuff.q0t4")` → `await ext.activate()` (so activation order doesn't matter) → `guardQ0T4Api(exports)` → a `Q0T4Budget` when `ready`. It re-runs on `extensions.onDidChange` (install, uninstall, enable, disable). When the state leaves `ready`, in-flight streams are cancelled. There's **no** `extensionDependencies` ([PLAN §2.3](../PLAN.md#23-how-r3p0-depends-on-q0t4-a-runtime-check-not-extensiondependencies)).

## Tests to write first
*(unit: `test/unit/budget/availabilityMachine.test.ts`, the pure state transitions behind the locator)*
- `missing → ready when Q0T4 appears`
- `ready → missing cancels in-flight requests`
- `activate rejecting gives activation-failed with the message`
- `a re-check while one is in progress is coalesced`

*(integration)*
- `with-q0t4: availability is ready`
- `with-q0t4: R3P0 is ready even when R3P0 activates before the fake Q0T4` (fake activation delayed by env)
- `without-q0t4: availability is missing`
- `q0t4-api-v2: availability is version-mismatch with found 2`
- `with-q0t4: a fake whose activate throws (FAKE_Q0T4_THROW=1) gives activation-failed`

## Implementation tasks
- [ ] `src/core/budget/availabilityMachine.ts`
- [ ] `src/adapters/q0t4Locator.ts`
- [ ] Fake Q0T4 env switches: `FAKE_Q0T4_THROW`, `FAKE_Q0T4_ACTIVATION_DELAY_MS`

## Acceptance criteria
- [ ] The listed tests pass across all three integration configs, and CI is green

## Depends on
#06, #29

## Labels
`feature`

## Estimate
M
