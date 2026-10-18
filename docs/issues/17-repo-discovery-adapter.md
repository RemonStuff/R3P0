# 17: `RepoDiscoveryPort` adapter: workspace folders and the git API

**Iteration:** 2 (One tab per repo)

## Description
The `workspaceRepos` adapter reports one `RepoInfo` per **workspace folder** (`{ key, folderName, folderUri, remotes }`), in folder order. Remotes come from the built-in git extension (`vscode.git`, `getAPI(1)`), taken from the repository **whose root contains the folder**, the same as Q0T4. It:
- waits for the git API to be `initialized` (with a timeout of about 3 s), then reports folders without remotes and updates later
- re-emits on `workspace.onDidChangeWorkspaceFolders`, `onDidOpenRepository`, `onDidCloseRepository`, each repository's `state.onDidChange` (remotes) and `onDidChangeEnablement`
- degrades gracefully: if git is disabled or missing, or the folder isn't a repo, it reports no remotes and never throws

Only a minimal `git.d.ts` subset is copied in (`API`, `Repository.rootUri`, `state.remotes`, events). No runtime dependency is added.

## Tests to write first
*(integration, `with-q0t4` config using the generated multi-root workspace)*
- `reports one RepoInfo per workspace folder in order`
- `the repo with origin reports the origin remote`
- `the repo with only upstream reports upstream`
- `the plain folder reports no remotes`
- `a folder inside a git repo (not at its root) reports the containing repo's remotes`
- `adding a folder with updateWorkspaceFolders emits a list that contains it`
- `removing a folder emits a list without it`
- `adding a remote with git remote add emits the new remote` (polls for up to 5 s)
- `with the git API missing (adapter built with no extension) it reports folders without remotes and does not throw`

## Implementation tasks
- [ ] `src/adapters/git.d.ts` (subset)
- [ ] `src/adapters/workspaceRepos.ts`
- [ ] Debounce bursts of events (100 ms) in the adapter, through the ClockPort-based debouncer from core

## Acceptance criteria
- [ ] The listed tests pass, and CI is green

## Depends on
#06, #15

## Labels
`feature`

## Estimate
M
