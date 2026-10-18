# 47: README, manual testing and release

**Iteration:** 7 (Hardening and release) 🎯 **Release candidate**

## Description
Get R3P0 ready for release. The README covers what R3P0 is, the **Q0T4 requirement** (and its version), installing both `.vsix` files, how tabs map to repos and how identity matches Q0T4, the budget states, borrowing, attachments, settings, known limits (estimates only, remote development needs both extensions in the same host, nested repos aren't separate tabs, nothing is synced), and privacy (nothing leaves the machine except through Q0T4's model requests). Also add `CHANGELOG.md`, finish `docs/manual-testing.md`, and add a release workflow that attaches the `.vsix` to a GitHub Release when a `v*` tag is pushed.

## Tests to write first
- `package.json has no extensionDependencies` (unit, reading `package.json`)
- `package.json contributes no setting that enables simulated budget outside development` (the description says so, and #36 enforces it)
- `the packaged .vsix contains README.md, CHANGELOG.md, LICENSE, dist/ and nothing from src/ or test/` (integration of `vsce ls`)
- `CI fails the release job when the tag doesn't match package.json version` (seen red once on a throwaway tag)

## Implementation tasks
- [ ] `README.md`, `CHANGELOG.md`, `LICENSE`
- [ ] `.github/workflows/release.yml`
- [ ] The complete `docs/manual-testing.md` checklist across all iterations
- [ ] Bump to `0.1.0`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: the full checklist passes on a clean VS Code profile with Q0T4's `.vsix` installed, and the release `.vsix` installs from the GitHub Release

## Depends on
#43, #44, #45, #46

## Labels
`docs`, `infra`

## Estimate
S
