# 03: Port interfaces, domain types and Q0T4 contract types

**Iteration:** 0 (Test harness)

## Description
Write down every boundary before any logic: the port interfaces (`BudgetPort`, `RepoDiscoveryPort`, `ChatHistoryPort`, `ModelCatalogPort`, `WebviewChannelPort`, `ClockPort`, `UiPort`) and the domain types (`RepoInfo`, `RepoTab`, `ModelRef`, `ModelInfo`, `ChatMessage`, `Conversation`, `Turn`, `BudgetSnapshot`, `SpendDecision`, `Reply`, `ReplyOutcome`, `Availability`).

Also add the **Q0T4 contract types** from [Q0T4-API-CONTRACT.md §2](../Q0T4-API-CONTRACT.md#2-types-r3p0-relies-on), which follow Q0T4 PLAN §9.8. Q0T4's API uses `vscode` types, but ports can't import `vscode`, so `src/ports/q0t4Api.ts` declares them **generically**: `Q0T4Api<V>` / `Q0T4Client<V>` over a `V extends { Model; Message; Options; Token; Event<T> }` type bundle. `src/adapters/q0t4Types.ts` instantiates them with the real `vscode` types. Provisional shapes (`StatusSnapshot`, refusal details) are marked in comments that link to Q0T4-REQUESTS R1/R2.

These are types only, so the tests are compile-time checks.

## Tests to write first
*(`test/unit/types/ports.test.ts`, using `expectTypeOf`; enforced by `npm run typecheck`, the same as Q0T4)*
- `BudgetPort.send takes a ModelRef and plain ChatMessages and returns a Reply with chunks and outcome`
- `BudgetPort.allowReserve takes a subject and resolves a boolean`
- `Availability is a discriminated union of ready | missing | activation-failed | version-mismatch | incompatible`
- `SpendDecision covers allowed (with wouldBorrow) and refused with over-budget | blocked | no-prices | needs-reserve-approval | unknown`
- `Q0T4Api.apiVersion is the literal 1 and forExtension returns a Q0T4Client`
- `Q0T4Client.sendRequest takes the model and message types from the type bundle`
- `Q0T4BudgetError.code is the union of the four Q0T4 codes`
- `Turn.status covers complete | stopped-by-user | stopped-by-budget | failed | interrupted`

*(`test/unit/types/q0t4Api.test.ts`, with type-only `vscode` imports, which are erased at runtime)*
- `Q0T4Client<VscodeTypes>.sendRequest accepts vscode.LanguageModelChat, LanguageModelChatMessage[], LanguageModelChatRequestOptions | undefined and CancellationToken`

## Implementation tasks
- [ ] `src/ports/*.ts` (one file per port) and `src/ports/q0t4Api.ts` (generic)
- [ ] `src/adapters/q0t4Types.ts` (the `vscode` instantiation, types only)
- [ ] `src/core/types.ts`
- [ ] Prove the type tests can fail (mutate one union and see typecheck go red)

## Acceptance criteria
- [ ] The type tests pass, `npm run typecheck` is clean, and lint confirms ports don't import `vscode`

## Depends on
#01

## Labels
`infra`

## Estimate
S
