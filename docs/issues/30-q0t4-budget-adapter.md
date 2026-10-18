# 30: `Q0T4Budget`: the real `BudgetPort` over Q0T4's client

**Iteration:** 4 (Q0T4 integration)

## Description
`Q0T4Budget` implements `BudgetPort` over the `Q0T4Client` from Q0T4 §9.8. It's in **pure core**: it's generic over the vscode types, and the adapter injects three small functions:
- `resolveModel(ref: ModelRef) → Model | undefined`: re-selects the `LanguageModelChat` with `selectChatModels({ vendor, id })` right before each send, so R3P0 never stores the object
- `toMessages(ChatMessage[]) → Message[]`: `LanguageModelChatMessage.User/Assistant`
- `linkToken(signal) → Token`: a `CancellationTokenSource` cancelled by the abort signal

It's the **only** place in R3P0 that calls `sendRequest`, and that's Q0T4's `client.sendRequest`.
- `send` → `client.sendRequest(subject, model, messages, undefined, token)`. It maps `stream` to `chunks`, and `result` to `ReplyOutcome` (`stopped: "budget"` → `stopped-by-budget`, `"cancelled"` → `stopped-by-user`, with `cost`, `borrowed` and `unit`). A `Q0T4BudgetError` becomes a typed refusal with its code and any details (R2). Any other rejection, including a `LanguageModelError`, is a model error. A model that can't be resolved is a `model-not-found` error **without** calling Q0T4.
- `check` → `client.canSpend(subject, { inputTokens, model: model.name })`, mapping `{ allowed, remaining, wouldBorrow, unit, reason }`. When degraded, it returns `allowed`, and refusals then come from `sendRequest`.
- `allowReserve(subject)` → runs the `q0t4.allowReserve` command through an injected command runner (R3). It returns `false` if the command doesn't exist.
- `status()` → `client.getStatus()`, mapped to `BudgetSnapshot`, with unknown fields ignored. When degraded, it returns `unavailable`.
- `onDidChangeUsage` → subscribe to `UsageChange { subject, source, cost }`. When degraded, it emits on its own after each send and every 60 s while visible (ClockPort).

## Tests to write first
*(`test/contract/budgetPort.contract.test.ts`: the shared `budgetPortContract` suite now also runs against `Q0T4Budget(FakeQ0T4Api)`)*
- all the contract cases from #04 pass for both implementations

*(`test/unit/budget/q0t4Budget.test.ts`)*
- `send resolves the model ref, converts the messages and calls client.sendRequest with the subject`
- `send rejects with model-not-found and never calls Q0T4 when the model ref can't be resolved`
- `aborting the signal cancels the linked token`
- `result.stopped "budget" maps to stopped-by-budget with cost and borrowed`
- `result.stopped "cancelled" maps to stopped-by-user`
- `an unknown stopped value maps to failed with a generic message`
- `each Q0T4BudgetError code maps to the matching refusal, keeping its details`
- `an unknown Q0T4BudgetError code maps to refused "unknown" with the message`
- `a non-Q0T4 rejection maps to a model error carrying the LanguageModelError code`
- `check passes the estimated inputTokens and the model name to canSpend`
- `check maps wouldBorrow and remaining`
- `check with canSpend degraded returns allowed`
- `allowReserve runs q0t4.allowReserve with the subject and returns false when the command is missing`
- `status with getStatus degraded returns unavailable`
- `status ignores unknown snapshot fields`
- `without onDidChangeUsage, a usage change is emitted after each send and every 60 s`

## Implementation tasks
- [ ] `src/core/budget/q0t4Budget.ts` (generic, with injected `resolveModel`, `toMessages`, `linkToken`, `runCommand`)
- [ ] Extend `FakeQ0T4Api` where the tests need it

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] README.md updated

## Depends on
#04, #06, #29

## Labels
`feature`, `test`

## Estimate
M
