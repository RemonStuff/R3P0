# 02: Vitest, DOM tests and enforced core coverage

**Iteration:** 0 (Test harness)

## Description
Add Vitest `^5.0.5` with `@vitest/coverage-v8`, the same as Q0T4: `vscode` aliased to a module that throws, and v8 coverage on `src/core/**` with **90% line and branch thresholds**. Add a second Vitest project for **DOM tests** of the webview using **happy-dom** (`test/webview/**/*.test.ts`), so the webview's render functions are tested without a browser.

## Tests to write first
*(`test/unit/tooling/vitest-setup.test.ts`)*
- `vitest discovers tests under test/unit, test/fakes, test/contract and test/webview and skips fixture tests`
- `coverage run fails when core branch coverage is below 90%` (fixture `test/fixtures/coverage-gate/`, copied from Q0T4)
- `importing vscode from a core test fails fast`
- `DOM tests run in happy-dom: document and window exist` (in `test/webview/environment.test.ts`)
- `node unit tests have no DOM: document is undefined`

## Implementation tasks
- [ ] Add `vitest`, `@vitest/coverage-v8` and `happy-dom` as dev dependencies
- [ ] `vitest.config.ts` with two projects, `unit` (node) and `dom` (happy-dom). Export the `unitTest` options so the coverage-gate fixture reuses the real thresholds
- [ ] `test/unit/no-vscode.ts` (throws, the same message style as Q0T4)
- [ ] Scripts: `test`, `test:unit`, `test:unit:watch`, `coverage`
- [ ] Report `src/webview/**` coverage without gating it

## Acceptance criteria
- [ ] The listed tests pass, and `npm run coverage` enforces 90% lines and branches on `src/core/**`
- [ ] CI isn't set up yet (#07), so this is checked locally on Windows

## Depends on
#01

## Labels
`infra`, `test`

## Estimate
S
