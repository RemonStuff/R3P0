# 03: Port interfaces, domain types and Q0T4 contract types

**Iteration:** 0 (Test harness)

## Description
Write down every boundary before any logic: the port interfaces (`BudgetPort`, `RepoDiscoveryPort`, `ChatHistoryPort`, `ModelCatalogPort`, `WebviewChannelPort`, `ClockPort`, `UiPort`), the domain types (`RepoInfo`, `RepoTab`, `ModelRef`, `ModelInfo`, `Conversation`, `Turn`, `BudgetSnapshot`, `SpendDecision`, `Reply`, `ReplyOutcome`, `Availability`) and the **Q0T4 contract types** from [Q0T4-API-CONTRACT.md](../Q0T4-API-CONTRACT.md) in `src/ports/q0t4Api.ts`. These are types only, so the tests are compile-time checks.

## Tests to write first
*(`test/unit/types/ports.test-d.ts`, using `expectTypeOf`)*
- `BudgetPort.send returns a Reply with chunks: AsyncIterable<string> and outcome: Promise<ReplyOutcome>`
- `Availability is a discriminated union of ready | missing | activation-failed | version-mismatch | incompatible`
- `Q0T4ApiV1.apiVersion is the literal 1`
- `Q0T4ApiV1 getStatus, canSpend and onDidChangeUsage are optional; sendRequest is required`
- `Q0T4ModelRef has only vendor and id (no LanguageModelChat)`
- `Q0T4Message is plain JSON with role user | assistant`
- `Turn.status covers complete | stopped-by-user | stopped-by-budget | failed | interrupted`

## Implementation tasks
- [ ] `src/ports/*.ts` (one file per port) and `src/ports/q0t4Api.ts`
- [ ] `src/core/types.ts`
- [ ] Enable Vitest `typecheck` for `*.test-d.ts`
- [ ] Add a typecheck-only assertion in `test/integration/types.ts` that `vscode.CancellationToken` is assignable to `Q0T4CancellationToken`

## Acceptance criteria
- [ ] The type tests pass, `npm run typecheck` is clean, and lint confirms ports don't import `vscode`

## Depends on
#01

## Labels
`infra`

## Estimate
S
