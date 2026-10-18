# 09: Webview ↔ host protocol: message types and validators

**Iteration:** 1 (Walking skeleton)

## Description
`postMessage` / `onDidReceiveMessage` are typed `any`, so every message crossing the boundary is validated in pure core. `core/protocol` defines `PROTOCOL_VERSION = 1`, the `WebviewMessage` and `HostMessage` unions ([PLAN §4](../PLAN.md#4-webview--extension-protocol)), and the parsers `parseWebviewMessage(raw)` and `parseHostMessage(raw)`, which return `{ ok: true, msg } | { ok: false, reason }` and never throw. Both bundles import these types. This issue covers only the messages iteration 1 needs (`ready`, `send`, `snapshot`, `turnStarted`, `chunk`, `turnEnded`, `error`). Later issues add their own messages, test-first, here.

## Tests to write first
*(`test/unit/protocol/parse.test.ts`)*
- `parses a valid ready message`
- `parses a valid send message and trims text`
- `rejects send with empty or whitespace-only text`
- `rejects send with text over 100 kB`
- `rejects a message with the wrong protocol version`
- `rejects an unknown type`
- `rejects non-object input: null, string, number, array`
- `rejects send with a non-string tabKey`
- `ignores extra unknown fields`
- `parseHostMessage round-trips every HostMessage built by the host helpers`
- `never throws on a hostile input` (an object with a throwing getter, a prototype-polluting `__proto__` key)

## Implementation tasks
- [ ] `src/core/protocol/messages.ts` (types + small builder helpers)
- [ ] `src/core/protocol/parse.ts` (hand-written guards, no runtime schema library)

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#03

## Labels
`feature`

## Estimate
S
