# 06: Integration runner, `FakeQ0T4Api` and the fake Q0T4 extension

**Iteration:** 0 (Test harness)

## Description
Set up `@vscode/test-cli` and `@vscode/test-electron` so a real VS Code instance loads R3P0 next to two **test-only fixture extensions**:
- **`fake-q0t4`**: package `publisher: "RemonStuff"`, `name: "q0t4"`, so `getExtension("RemonStuff.q0t4")` finds it. Its `activate()` returns a `FakeQ0T4Api`, bundled from `test/fakes/fakeQ0T4Api.ts`, so unit and integration tests script the same fake. The commands `fake-q0t4.script(...)` and `fake-q0t4.reset()` let tests script it, and `FAKE_Q0T4_API_VERSION` in the env overrides `apiVersion`.
- **`fake-lm-provider`**: registers the vendor `r3p0-test` through `vscode.lm.registerLanguageModelChatProvider`, so the model picker has models. R3P0 never sends to them.

Also add a script that generates a **multi-root test workspace**: temporary git repos (one with `origin` on GitHub, one with only `upstream`, one with no remote) plus a plain folder, written to a `.code-workspace` file.

The real Q0T4 and real Copilot models are never used.

## Tests to write first
*(unit: `test/fakes/fakeQ0T4Api.test.ts`)*
- `apiVersion defaults to 1 and can be overridden`
- `members can be removed to simulate an incomplete API`
- `sendRequest streams scripted text and resolves result`
- `sendRequest rejects with code borrow-required unless options.approveBorrow`
- `sendRequest ends text early with result.stopped = "budget" when scripted`
- `sendRequest honours the cancellation token`
- `getStatus returns an entry for each requested subject`
- `onDidChangeUsage fires when emit is called`

*(integration: `test/integration/harness.test.ts`)*
- `R3P0 extension is present in the test instance`
- `fake Q0T4 is found as RemonStuff.q0t4 and activate() returns apiVersion 1`
- `fake LM provider models are visible via selectChatModels({ vendor: "r3p0-test" })`
- `the test workspace has 4 folders and the git repos have the scripted remotes`
- `no test file references vendor "copilot"` (grep test)

## Implementation tasks
- [ ] Add `@vscode/test-cli`, `@vscode/test-electron` and `@types/mocha`
- [ ] `.vscode-test.mjs` with the labelled configs `with-q0t4`, `without-q0t4` and `q0t4-api-v2` (env `FAKE_Q0T4_API_VERSION=2`), with a pinned VS Code version
- [ ] `test/fixtures/fake-q0t4/` (package.json + an esbuild bundle of `test/fakes/fakeQ0T4Api.ts`)
- [ ] `test/fixtures/fake-lm-provider/`
- [ ] `test/fixtures/workspaces/create.mjs` (run as `pretest:integration`)
- [ ] Script `test:integration`, and `test/integration/README.md` (how to run and debug)

## Acceptance criteria
- [ ] The listed tests pass via `npm run test:integration` on Windows, and under `xvfb-run` on Linux
- [ ] The `without-q0t4` config proves `getExtension("RemonStuff.q0t4")` is `undefined`

## Depends on
#02, #03

## Labels
`infra`, `test`

## Estimate
M
