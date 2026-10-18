# 05: `FakeRepoDiscovery`, `InMemoryHistory`, `FixedClock` and the other fakes

**Iteration:** 0 (Test harness)

## Description
The remaining test doubles, each test-first: `FakeRepoDiscovery`, `InMemoryHistory`, `FixedClock` (with timers, because the chunk batcher and the debouncer depend on it), `FakeModelCatalog`, `FakeWebviewChannel` and `FakeUi`.

## Tests to write first
**FakeRepoDiscovery**
- `current returns the configured repos in folder order`
- `set + emit notifies onDidChange listeners with the new list`
- `returns an empty list when configured with no folders`

**InMemoryHistory**
- `get returns undefined for a missing key`
- `get returns a deep copy, not the stored reference`
- `keys lists stored keys`
- `set rejects when a write failure is injected`

**FixedClock**
- `now returns the configured instant`
- `timeZone returns the configured IANA zone`
- `advance moves time forward and runs due timers in order`
- `a disposed timer never runs`
- `set jumps to an ISO instant`

**FakeModelCatalog, FakeWebviewChannel, FakeUi**
- `FakeModelCatalog lists configured models and fires onDidChange when replaced`
- `FakeWebviewChannel records posted messages in order`
- `FakeWebviewChannel.receive delivers raw messages to onMessage listeners`
- `FakeWebviewChannel.post resolves false while hidden`
- `FakeUi records status bar states, opened extensions, copied text and external links`

## Implementation tasks
- [ ] One file per fake in `test/fakes/`, each `satisfies <Port>`
- [ ] Add them to the barrel export

## Acceptance criteria
- [ ] All the listed tests pass, and typecheck proves every fake matches its port

## Depends on
#02, #03

## Labels
`test`

## Estimate
S
