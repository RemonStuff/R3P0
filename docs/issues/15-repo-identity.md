# 15: Repo identity matching Q0T4 (with a contract test)

**Iteration:** 2 (One tab per repo)

## Description
Each tab's subject must be **exactly** what Q0T4 would charge. `core/repos/repoIdentity.ts` implements Q0T4's rules (Q0T4 issue 27): the `origin` remote normalised to `owner/repo` → the first remote → the folder name. `normaliseRemote` handles HTTPS, SSH (`git@host:o/r.git`), `ssh://`, a trailing `.git`, credentials in URLs, GitLab subgroups, Azure DevOps (HTTPS and SSH v3), trailing slashes and whitespace, and never includes the host. It returns `{ subject, source: "origin" | "remote" | "folder" }`.

The **contract test** runs the case table copied verbatim from Q0T4 issue 27 into `test/contract/q0t4-repo-identity-cases.json`, recording the Q0T4 commit it came from (see Q0T4-REQUESTS R8).

## Tests to write first
*(`test/contract/repoIdentity.contract.test.ts`, `it.each` over the JSON table)*
- `normalises https://github.com/RemonStuff/Q0T4.git to RemonStuff/Q0T4`
- `normalises git@github.com:RemonStuff/Q0T4.git to RemonStuff/Q0T4`
- `normalises ssh://git@github.com/RemonStuff/Q0T4 to RemonStuff/Q0T4`
- `strips credentials: https://user:token@github.com/o/r.git → o/r`
- `keeps GitLab subgroups: https://gitlab.com/group/sub/repo.git → group/sub/repo`
- `normalises Azure DevOps https://dev.azure.com/org/project/_git/repo → org/project/repo`
- `normalises Azure DevOps SSH git@ssh.dev.azure.com:v3/org/project/repo → org/project/repo`
- `trailing slashes and whitespace are ignored`
- `an unparseable URL falls back to the folder name`
- `prefers origin over other remotes`
- `uses the first remote when there is no origin`
- `uses the folder name when there are no remotes`
- `never includes the host name`

*(`test/unit/repos/repoIdentity.test.ts`, R3P0-specific)*
- `reports source origin | remote | folder`
- `the case table file records a Q0T4 commit hash` (guards against an edited copy)
- `a remote with only a pushUrl is used when fetchUrl is missing`

## Implementation tasks
- [ ] `src/core/repos/repoIdentity.ts`: `normaliseRemote(url)`, `repoIdentity(info)`
- [ ] `test/contract/q0t4-repo-identity-cases.json`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#03

## Labels
`feature`, `test`

## Estimate
S
