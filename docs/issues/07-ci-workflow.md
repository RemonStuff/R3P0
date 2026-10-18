# 07: GitHub Actions CI

**Iteration:** 0 (Test harness)

## Description
Every push and pull request runs lint, typecheck, format check, unit and DOM tests with enforced core coverage (on Ubuntu and Windows), integration tests under xvfb, and packaging. **Docs branches (`docs/**`) skip every job.** This also adds the bug template that enforces "every bug fix starts with a failing test", and a PR template with the red → green → refactor checklist.

## Tests to write first
CI configuration can't be unit tested usefully. Instead, prove each gate goes red on a throwaway branch, and link the runs in the PR:
- `CI fails on a lint error`
- `CI fails when core coverage drops below 90%`
- `CI fails when a DOM test fails`
- `CI fails when an integration test fails`
- `CI passes on main`
- `CI does not run for a push to a docs/ branch`
- `CI skips the jobs on a PR whose head branch is docs/...`

## Implementation tasks
- [ ] `.github/workflows/ci.yml`: `on: push (branches-ignore: ["docs/**"])` and `pull_request`, with each job guarded by `if: ${{ !startsWith(github.head_ref, 'docs/') }}`
  - `check` (ubuntu): `npm ci`, lint, typecheck, `format:check`
  - `unit` (a matrix of ubuntu-latest and windows-latest, Node 24): `npm run coverage`, uploading the report
  - `integration` (ubuntu): `xvfb-run -a npm run test:integration`, caching `.vscode-test/`
  - `package` (needs all of the above): `npx @vscode/vsce package`, uploading `r3p0-*.vsix`
- [ ] `.github/ISSUE_TEMPLATE/bug.md` with a required "Failing test that reproduces it" section
- [ ] `.github/pull_request_template.md` (red → green → refactor, `Closes #NN`)
- [ ] A CI badge in the README stub

## Acceptance criteria
- [ ] Each "fails…" case was seen red once (linked in the PR)
- [ ] CI is green on `main`
- [ ] Manual: download the `.vsix` artifact from a run

## Depends on
#02, #06

## Labels
`infra`

## Estimate
S
