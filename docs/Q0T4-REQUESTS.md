# Requests for Q0T4

Things R3P0 needs from Q0T4 that aren't in Q0T4's plan yet. R3P0 never changes Q0T4. Remon takes these to the Q0T4 repo. Each request says what R3P0 does until it's resolved.

*Reviewed against Q0T4 `main` @ `ff0e4d2` (PLAN §9.8, issues #57, #61, #63–#66).*

## Open

| # | Request | Why | Until then, R3P0… |
|---|---|---|---|
| R1 | **Publish the exact types early:** `StatusSnapshot`, `SpendCheck`, `MeteredResponse` (is `text` a `Promise<string>`? which values can `result.stopped` take?), `UsageChange`, `Q0T4BudgetError`. #63 plans `src/api.d.ts` "for consumers to copy". Could it land before the implementation? It would also help if the snapshot carried a **per-subject state** (`ok`/`warning`/`exhausted`) and the **warning thresholds** (`warnAtPercent`, `monthlyPaceWarning`), so consumers don't re-derive them. | R3P0 builds its adapter and fakes against these shapes, and shows the same warnings as `@q0t4`. | Uses the provisional shapes in [Q0T4-API-CONTRACT.md](Q0T4-API-CONTRACT.md) §2. |
| R2 | **Enumerate the refusal details:** the `SpendCheck.reason` values, and the fields a `Q0T4BudgetError` carries ("the refusal details": used, budget, resetsAt, unit, subject?). | R3P0 shows "150k / 150k, resets Mon 19 Oct" and decides which button to offer. | Reads those fields if present, and otherwise shows the error message. |
| R3 | **Granting the reserve from the API:** add `client.allowReserve(subject)` (preferred), or document the `q0t4.allowReserve` command's arguments (subject? week?) as part of the v1 contract. | In `"ask"` mode, R3P0 must offer **Allow reserve for ‹repo› this week** in its own UI. Q0T4 #57 only describes the chat button. | Runs `q0t4.allowReserve` with the subject as the only argument, and falls back to opening Q0T4. |
| R4 | **Name the commands the refusal buttons need** (refresh model prices, open Q0T4 settings for a subject) as part of the contract, or include them as `actions` in `Q0T4BudgetError`. | `no-prices` and `blocked` refusals need a way out. | Opens Q0T4's settings (`workbench.action.openSettings` with `@ext:RemonStuff.q0t4`). |
| R5 | **`getStatus` includes every subject a consumer asks about**, for example `getStatus({ subjects })`, including repos with no usage yet (default budget or default share). | R3P0's tabs and Overview should show a budget for a repo before its first request. | Shows "No budget info yet" for missing subjects. |
| R6 | **`canSpend`'s `model` string: is it the display `name` or the `id`?** | Q0T4 matches prices on `name` first, then `family`/`id`. | Passes `model.name`. |
| R7 | *(Nice to have)* **`client.subjectForFolder(uri)`**, using Q0T4's own resolver. | One source of truth for repo identity. | Uses its own copy of the issue 27 rules, contract-tested against R8. |
| R8 | **Publish the repo-identifier case table** from issue 27 as a data file (for example `test/contract/repo-identity-cases.json`). | R3P0's contract test can copy it verbatim and notice when it changes. | Copies the cases from the issue 27 text, recording the Q0T4 commit. |
| R9 | **Two concurrent `sendRequest` calls on the same subject:** the ledger is safe (one writer per host, §9.5), but can both pass the pre-check and together overshoot? Document the behaviour. | Two R3P0 tabs can share a subject (two clones), and `@q0t4` can run at the same time. | Allows only one request in flight per tab. |
| R10 | **`onDidChangeUsage` also fires when budgets change without a ledger append** (settings, shares, a new week or cycle starting). | Tab headers would go stale. | Also refreshes every 60 s while visible, and on window focus. |
| R11 | **The context window via the API:** does `sendRequest` trim or refuse when the messages exceed `maxInputTokens`, and with which error? | R3P0 can only estimate. | Trims conservatively (`chars / 4 × 1.1`), and maps an unexpected rejection to a model error. |
| R12 | **Model errors pass through unchanged:** `LanguageModelError` from the model (`NoPermissions`, `NotFound`, `Blocked`) reaches the consumer as-is, distinct from `Q0T4BudgetError`. | R3P0 shows consent hints and "pick another model". | Treats any rejection that isn't a `Q0T4BudgetError` as a model error. |
| R13 | **A pre-release of the API** (for example a `0.9.x` `.vsix` with #63/#64) before v1.0. | R3P0's iteration 4 is ready long before Q0T4's iteration 9, and would like a real manual check sooner. | Tests only against the fake Q0T4. |
| R14 | **Keep the default (workspace) `extensionKind`.** | `exports` are only visible within one extension host. §9.8 already assumes consumers run in Q0T4's host, which matters for remote development (SSH, WSL, Codespaces). | Documents the same constraint. |

## Resolved by Q0T4's §9.8 (`ff0e4d2`)

| Was | Outcome |
|---|---|
| Write PLAN §9 | ✅ Written (§9.1–§9.8, issues #53–#66). |
| Pass a model reference `{ vendor, id }` instead of a `LanguageModelChat` | ❌ **Declined.** Q0T4 takes the consumer's `LanguageModelChat`, so consent is the consumer's. R3P0 adapts: core keeps `ModelRef`, and the adapter re-selects the model object. |
| Plain JSON messages | ❌ **Declined.** It takes `vscode.LanguageModelChatMessage[]`. The R3P0 adapter converts. |
| Structured errors | ✅ Mostly: `Q0T4BudgetError` with four codes (details still open, R2). A mid-stream budget stop is `result.stopped === "budget"`, not a rejection. |
| Borrow approval through the API | ⚠️ **Partly:** `needs-reserve-approval` exists, and a grant lasts for subject and week, but there's no API method to grant (R3). |
| Ledger attribution (`source: "r3p0"`) | ✅ Through `forExtension("RemonStuff.r3p0")` → `api:RemonStuff.r3p0`. |
| Cancellation token used structurally | ✅ Moot: it's a `vscode.CancellationToken`, and the R3P0 adapter passes a real one. |
| Usage event on budget changes | ⚠️ **Partly:** it fires after any ledger append, including resets and `/sync`. Settings changes are still open (R10). |
