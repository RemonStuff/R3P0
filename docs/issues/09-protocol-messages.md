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
- `accepts exactly 100,000 UTF-8 bytes after trimming and rejects one byte over, including multibyte text`
- `rejects a message with the wrong protocol version`
- `rejects an unknown type`
- `rejects non-object input: null, string, number, array`
- `rejects send with a non-string tabKey`
- `ignores extra unknown fields`
- `parseHostMessage round-trips every HostMessage built by the host helpers`
- `never throws on a hostile input` (an object with a throwing getter, a prototype-polluting `__proto__` key)
- `validates nested snapshot, turn, model, attachment and usage payloads`
- `preserves empty and whitespace-only chunks without trimming`
- `the shared contract works in the webview's browser environment too`

## Contract details

See [PLAN §4.1](../PLAN.md#41-iteration-1-contract-09) for the exact iteration 1 payloads and snapshot shape. The limit is 100,000 UTF-8 bytes of the trimmed prompt, not 100,000 JavaScript characters. Unknown fields are removed without reading their values. Invalid inputs return an explicit reason, including when getters or proxies are hostile.

The snapshot starts with transcripts, partial streaming replies, the active tab and the `ready`/`missing` availability variants. Later issues extend the shared contract for richer Q0T4 states, model selection, budgets and attachments. This issue does not wire a controller or change the installed placeholder.

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
