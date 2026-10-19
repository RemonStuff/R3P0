# Integration tests

These tests run inside a real VS Code (pinned to 1.142.0 in `.vscode-test.mjs`, the same as Q0T4), which opens a generated multi-root workspace. **No test ever uses the real Q0T4 or a real model.**

## Configurations

| Label          | Extensions loaded                     | Proves                                                    |
| -------------- | ------------------------------------- | --------------------------------------------------------- |
| `with-q0t4`    | R3P0, `fake-q0t4`, `fake-lm-provider` | the normal path, through the fake Q0T4                    |
| `without-q0t4` | R3P0, `fake-lm-provider`              | `getExtension("RemonStuff.q0t4")` is `undefined`          |
| `q0t4-api-v2`  | R3P0, `fake-q0t4` with API version 2  | a version mismatch (`FAKE_Q0T4_API_VERSION=2` in the env) |

Each config runs the tests in `test/integration/<label>/`.

Every config also runs `stub-view.test.ts`. It opens `r3p0.chat`, checks the placeholder and its strict content security policy, and reads the resolved view through R3P0's test-only API. This proves the placeholder does not depend on Q0T4 being present or compatible.

## Fixtures

- **`test/fixtures/fake-q0t4`** has the same ID as Q0T4 (`RemonStuff.q0t4`) and exports `FakeQ0T4Api`, the same scripted fake the unit tests use (`test/fakes/fakeQ0T4Api.ts`), bundled by `test/fixtures/build.mjs`. It never calls the model it's given.
- **`test/fixtures/fake-lm-provider`** registers the vendor **`r3p0-test`** (models `Fake Mini` and `Fake Large`), so R3P0 has real `LanguageModelChat` objects for its picker and to hand to the fake Q0T4. **It throws on every request and token count**: in R3P0 only Q0T4 may use a model.
- **`test/fixtures/workspaces/create.mjs`** writes `.vscode-test/workspace/r3p0.code-workspace` with four folders: `origin-repo` (`origin` on GitHub), `upstream-only` (only `upstream`, SSH), `no-remote` (a git repo without remotes) and `plain-folder` (not a repo).

A unit test (`test/unit/tooling/integration-guard.test.ts`) fails if any test or fixture uses `vendor: "copilot"`, or if the only `RemonStuff.q0t4` isn't the fake.

## Driving the fake Q0T4

| Command                       | Effect                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fake-q0t4.script(script)`    | Queues replies (`chunks`, `cost`, `borrowed`, `stop: "budget"`, `reject: { code, … }`), `spend` answers, a `status` snapshot, `needsReserve` subjects and `weekEndsAt` |
| `fake-q0t4.calls()`           | Returns what it received: extension IDs, `sendRequest` (subject, model vendor/id, message texts), `canSpend`, `allowReserve`                                           |
| `fake-q0t4.reset()`           | Clears scripts, calls and reserve grants                                                                                                                               |
| `fake-q0t4.emitUsage(change)` | Fires `onDidChangeUsage` with `{ subject, source, cost }`                                                                                                              |
| `q0t4.allowReserve(subject)`  | Q0T4's real command name: grants the reserve for that subject until `weekEndsAt`                                                                                       |

## Run

```sh
npm run test:integration
```

This builds R3P0 and the fake Q0T4, creates the workspace, compiles `test/integration` with `tsconfig.integration.json` into `out/`, and runs every config with `@vscode/test-cli`. The first run downloads VS Code into `.vscode-test/` (git-ignored). On Linux CI it runs under `xvfb-run -a`.

## Debugging

- One config: `npx vscode-test --label with-q0t4`
- One test: `npx vscode-test --label with-q0t4 --grep "<test name>"`
- Logs from the test instance are in `.vscode-test/user-data/logs/`.
