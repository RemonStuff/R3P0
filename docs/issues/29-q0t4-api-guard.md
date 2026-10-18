# 29: Q0T4 API guard (`apiVersion` and shape)

**Iteration:** 4 (Q0T4 integration)

## Description
`guardQ0T4Api(exports: unknown)` is pure core and never trusts the exports. It returns `{ state: "ready", api, degraded: ("getStatus" | "canSpend" | "onDidChangeUsage")[] }`, `{ state: "version-mismatch", found }` or `{ state: "incompatible", missing }`, following [Q0T4-API-CONTRACT §3](../Q0T4-API-CONTRACT.md#3-behaviour-when-something-is-missing-or-wrong). Every availability state has fixed user-facing text in `core/format`.

## Tests to write first
*(`test/contract/q0t4ApiShape.contract.test.ts`)*
- `a complete v1 API is ready with no degradations`
- `apiVersion 2 is version-mismatch with found 2`
- `a missing apiVersion is version-mismatch with found undefined`
- `apiVersion "1" (a string) is version-mismatch`
- `undefined exports is incompatible`
- `non-object exports (string, number, function) are incompatible`
- `a missing sendRequest is incompatible and lists sendRequest`
- `a missing getStatus is ready, degraded with getStatus`
- `a missing canSpend is ready, degraded with canSpend`
- `a missing onDidChangeUsage is ready, degraded with onDidChangeUsage`
- `a throwing getter on exports is incompatible, not a crash`

*(`test/unit/format/availability.test.ts`)*
- `each availability state has an explanation and offers Show Q0T4`
- `version-mismatch text names the found version`
- `activation-failed text includes the error message`

## Implementation tasks
- [ ] `src/core/budget/guardQ0T4Api.ts`
- [ ] `src/core/format/availability.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#03

## Labels
`feature`

## Estimate
S
