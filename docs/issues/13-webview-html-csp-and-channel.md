# 13: Webview HTML with a strict CSP, and the `WebviewView` channel adapter

**Iteration:** 1 (Walking skeleton)

## Description
`buildWebviewHtml({ cspSource, nonce, scriptUri, styleUri })` is pure and lives in core: it builds the page with a strict Content Security Policy (`default-src 'none'; script-src 'nonce-…'; style-src ${cspSource}; font-src ${cspSource}; img-src ${cspSource} https: data:`). The `webviewViewChannel` adapter implements `WebviewViewProvider` and `WebviewChannelPort`. It sets `enableScripts: true`, `localResourceRoots: [dist]`, **no** `retainContextWhenHidden` and no command URIs, and it forwards `onDidReceiveMessage` and `postMessage`.

## Tests to write first
*(unit: `test/unit/webview/html.test.ts`)*
- `CSP has default-src 'none'`
- `script-src allows only the nonce: no 'unsafe-inline', no 'unsafe-eval'`
- `style-src and font-src allow only cspSource`
- `the script tag carries the nonce and the scriptUri`
- `attribute values are escaped` (a cspSource containing quotes)
- `generateNonce returns 32 base64url characters and differs between calls` (randomness injected)

*(integration)*
- `resolving r3p0.chat sets enableScripts and localResourceRoots to dist only`
- `a message posted from the test API reaches channel.onMessage`
- `channel.post resolves false when the view is not visible`

## Implementation tasks
- [ ] `src/core/webview/html.ts`, `nonce.ts` (with a random-bytes port argument)
- [ ] `src/adapters/webviewViewChannel.ts`
- [ ] Replace the placeholder provider from #08

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: the Developer Tools console shows no CSP violations when the view opens

## Depends on
#08, #09

## Labels
`feature`

## Estimate
S
