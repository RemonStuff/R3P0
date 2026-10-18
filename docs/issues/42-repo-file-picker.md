# 42: `RepoFilesPort` and the repo file picker

**Iteration:** 6 (Repo-scoped context)

## Description
The `repoFilePicker` adapter implements `RepoFilesPort`:
- `pick(repo)`: a QuickPick of files from `workspace.findFiles(new RelativePattern(folder, "**/*"), <exclude>)`, limited to that tab's folder by construction and honouring `files.exclude`. **The active editor's file** is offered first when it's inside the repo.
- `read(repo, relPath, maxBytes)` with `workspace.fs.readFile`
- `realPath(uri)` for the symlink check

Every chosen file goes through `isInsideRepo` again before it's read. The picker never trusts its own results.

## Tests to write first
*(unit: `FakeRepoFiles` and a core `attachFlow` using it)*
- `attachFlow adds picked files that pass isInsideRepo`
- `attachFlow drops and reports a picked file outside the repo`
- `attachFlow reports files over the size limit`
- `cancelling the picker adds nothing`

*(integration)*
- `pick lists only files under the tab's folder` (the test drives the QuickPick through the test API)
- `the active editor's file is offered first when it is in the repo`
- `the active editor's file from another repo is not offered`
- `read returns the content of a file in the repo`
- `realPath resolves a symlink` (skipped on Windows CI without symlink rights)

## Implementation tasks
- [ ] `RepoFilesPort` in `src/ports`, and `FakeRepoFiles` with tests
- [ ] `src/core/context/attachFlow.ts`
- [ ] `src/adapters/repoFilePicker.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#41

## Labels
`feature`

## Estimate
M
