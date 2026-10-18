# 20: Wire one tab per repo

**Iteration:** 2 (One tab per repo) 🎯 **Install and try**

## Description
Connect `workspaceRepos` → `reconcileTabs` → `SessionManager` → `tabs` messages, so tabs appear and disappear **live** as folders are added or removed, and labels update when remotes change. The view's `description` shows the active tab's subject. Each tab sends with its own subject.

## Tests to write first
*(unit: controller, using FakeRepoDiscovery)*
- `emitting a new repo list posts a tabs message with the added tab`
- `a removed repo's tab disappears and its stream is cancelled`
- `send on tab B uses tab B's subject in BudgetPort.send`

*(integration, `with-q0t4` config)*
- `the snapshot lists Overview plus one tab per workspace folder with the expected labels and subjects`
- `adding a workspace folder adds a tab without reloading`
- `removing a workspace folder removes its tab`
- `sending from each tab charges that tab's subject in the fake Q0T4` (read back from the fake's call log)

## Implementation tasks
- [ ] Wiring in `extension.ts`
- [ ] Update the view `description` on `selectTab`
- [ ] Update `docs/manual-testing.md` for iteration 2

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: open a `.code-workspace` with 3+ repos. Each repo has its own tab named after it. Adding or removing a folder adds or removes a tab, and each tab's SIMULATED replies mention its own repo

## Depends on
#14, #17, #18, #19

## Labels
`feature`

## Estimate
S
