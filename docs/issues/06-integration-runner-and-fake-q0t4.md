# 06: Integration runner, `FakeQ0T4Api` and the fake Q0T4 extension

**Iteration:** 0 (Test harness)

## Description
Set up `@vscode/test-cli` and `@vscode/test-electron` so a real VS Code instance loads R3P0 next to two **test-only fixture extensions**:
- **`fake-q0t4`**: package `publisher: "RemonStuff"`, `name: "q0t4"`, so `getExtension("RemonStuff.q0t4")` finds it. Its `activate()` returns a `FakeQ0T4Api` shaped like Q0T4 §9.8 (`{ apiVersion: 1, forExtension(id) }` → a client), bundled from `test/fakes/fakeQ0T4Api.ts`, so unit and integration tests script the same fake. It also registers a fake `q0t4.allowReserve` command. The commands `fake-q0t4.script(...)`, `fake-q0t4.calls()` and `fake-q0t4.reset()` let tests script it and read what it received (the subject, the model's `vendor`/`id`, the message texts and the extension ID). `FAKE_Q0T4_API_VERSION` in the env overrides `apiVersion`. It streams scripted text and never calls the model it's given.
- **`fake-lm-provider`**: registers the vendor `r3p0-test` through `vscode.lm.registerLanguageModelChatProvider`, so the model picker has models, and R3P0 has real `LanguageModelChat` objects to hand to the fake Q0T4. It **throws on every request and token count**, so nothing in R3P0 (or its tests) can use a model without going through Q0T4.

Also add a script that generates a **multi-root test workspace**: temporary git repos (one with `origin` on GitHub, one with only `upstream`, one with no remote) plus a plain folder, written to a `.code-workspace` file.

The real Q0T4 and real Copilot models are never used.

## Tests to write first
*(unit: `test/fakes/fakeQ0T4Api.test.ts`)*
- `apiVersion defaults to 1 and can be overridden`
- `forExtension returns a client and records the extension id`
- `members can be removed to simulate an incomplete API (forExtension, or any client member)`
- `sendRequest streams scripted text through stream, resolves text and result { cost, stopped, borrowed }`
- `sendRequest rejects with a Q0T4BudgetError of the scripted code before streaming`
- `in ask mode, sendRequest rejects with needs-reserve-approval until allowReserve(subject) for this week`
- `sendRequest ends the stream early with result.stopped = "budget" when scripted`
- `sendRequest honours the cancellation token`
- `canSpend returns the scripted SpendCheck`
- `getStatus returns the scripted StatusSnapshot`
- `onDidChangeUsage fires { subject, source, cost } when emit is called`

*(integration: `test/integration/harness.test.ts`)*
- `R3P0 extension is present in the test instance`
- `fake Q0T4 is found as RemonStuff.q0t4 and activate() returns apiVersion 1 with forExtension`
- `the fake q0t4.allowReserve command is registered`
- `the fake Q0T4 streams scripted text for a real model object and records the call`
- `the fake LM provider refuses any request, so nothing can bypass Q0T4`
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
