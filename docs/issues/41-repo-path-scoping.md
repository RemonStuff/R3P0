# 41: Repo path scoping and attachment limits

**Iteration:** 6 (Repo-scoped context)

## Description
A chat may only see files from its own repo. `isInsideRepo(folderUri, fileUri, realPath?)` in pure core decides this. It handles `..` segments, mixed separators, Windows drive-letter and path casing, URL-encoded paths, a different URI scheme (refused), a sibling folder with a common prefix (`D:\Repos\Q0T4` vs `D:\Repos\Q0T4-old`), and symlinks that resolve outside the folder (the adapter supplies the real path). Attachment rules: at most 10 files per message, at most `r3p0.attachments.maxFileKB` (default 200) per file, text files only (refuse when a NUL byte is found in the first 8 kB), and duplicates are ignored.

## Tests to write first
*(`test/unit/context/isInsideRepo.test.ts`, `attachments.test.ts`)*
- `a file directly in the folder is inside`
- `a file in a nested subfolder is inside`
- `a .. path that escapes the folder is outside`
- `a sibling folder sharing the name prefix is outside`
- `drive letter and path casing differences on Windows are inside`
- `a different scheme (untitled:, vscode-remote: vs file:) is outside`
- `a symlink whose real path is outside is outside`
- `the folder itself is not an attachable file`
- `an 11th attachment is refused with a message`
- `a file over the size limit is refused with its size in the message`
- `a binary file is refused`
- `attaching the same path twice keeps one`

## Implementation tasks
- [ ] `src/core/context/isInsideRepo.ts`, `attachments.ts`
- [ ] Setting `r3p0.attachments.maxFileKB`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#15

## Labels
`feature`

## Estimate
S
