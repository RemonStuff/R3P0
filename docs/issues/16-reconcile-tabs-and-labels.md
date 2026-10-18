# 16: Reconcile tabs and their labels

**Iteration:** 2 (One tab per repo)

## Description
`reconcileTabs(previous, discovered: RepoInfo[])` turns the discovered repo list into an ordered tab list and reports `{ tabs, added, removed, changed }`. Tabs are keyed by folder URI, so a new remote changes the label and subject but **keeps** the tab and its history. `tabLabels` produces the label (the repo part of `owner/repo`, or the folder name) and **disambiguates** clashes: two tabs labelled `Q0T4` become `Q0T4 (Q0T4)` and `Q0T4 (Q0T4-worktree)`, using the folder names. The tooltip is `owner/repo · <folder path>`. The Overview tab is always first.

## Tests to write first
*(`test/unit/repos/reconcileTabs.test.ts`)*
- `first run: every discovered repo is added, in folder order, after Overview`
- `a folder added in the middle is inserted at its folder index`
- `a removed folder's tab is reported in removed`
- `a changed remote keeps the tab key and reports it in changed`
- `the same input twice reports no changes`
- `folder keys are compared case-insensitively on Windows drive letters` (`file:///d%3A/…` vs `file:///D%3A/…`)
- `an empty workspace yields only the Overview tab`

*(`test/unit/repos/tabLabels.test.ts`)*
- `label is the repo part of owner/repo`
- `label is the folder name when the identity source is folder`
- `GitLab subgroups use the last segment`
- `two tabs with the same label are disambiguated by folder name`
- `two tabs with the same subject (two clones) are disambiguated and still share the subject`
- `tooltip shows the subject and the folder path`

## Implementation tasks
- [ ] `src/core/repos/reconcileTabs.ts`, `src/core/repos/tabLabels.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#15

## Labels
`feature`

## Estimate
S
