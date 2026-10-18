# 29: Q0T4 API guard (`apiVersion`, `forExtension` and client shape)

**Iteration:** 4 (Q0T4 integration)

## Description
`guardQ0T4Api(exports: unknown, extensionId)` is pure core and never trusts the exports. It checks `apiVersion === 1`, calls `forExtension(extensionId)` (Q0T4 §9.8) inside a try/catch, and checks the returned client. It returns `{ state: "ready", client, degraded: ("getStatus" | "canSpend" | "onDidChangeUsage")[] }`, `{ state: "version-mismatch", found }` or `{ state: "incompatible", missing }`, following [Q0T4-API-CONTRACT §3](../Q0T4-API-CONTRACT.md#3-behaviour-when-something-is-missing-or-wrong). Every availability state has fixed user-facing text in `core/format`.

## Tests to write first
*(`test/contract/q0t4ApiShape.contract.test.ts`)*
- `a complete v1 API is ready with no degradations`
- `forExtension is called with "RemonStuff.r3p0"`
- `apiVersion 2 is version-mismatch with found 2`
- `a missing apiVersion is version-mismatch with found undefined`
- `apiVersion "1" (a string) is version-mismatch`
- `undefined exports is incompatible` (a Q0T4 from before the API)
- `non-object exports (string, number, function) are incompatible`
- `a missing forExtension is incompatible and lists forExtension`
- `forExtension throwing is incompatible with the error message`
- `a client without sendRequest is incompatible and lists sendRequest`
- `a client without getStatus is ready, degraded with getStatus`
- `a client without canSpend is ready, degraded with canSpend`
- `a client without onDidChangeUsage is ready, degraded with onDidChangeUsage`
- `a throwing getter on exports is incompatible, not a crash`

*(`test/unit/format/availability.test.ts`)*
- `each availability state has an explanation and offers Show Q0T4`
- `version-mismatch text names the found version`
- `activation-failed text includes the error message`
- `incompatible text for undefined exports says to update Q0T4`

## Implementation tasks
- [ ] `src/core/budget/guardQ0T4Api.ts`
- [ ] `src/core/format/availability.ts`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] README.md updated

## Depends on
#03

## Labels
`feature`

## Estimate
S
