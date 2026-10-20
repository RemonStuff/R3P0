---
post_title: "12: Webview DOM: transcript, composer and the message pump"
author1: "AI assistant"
post_slug: "r3p0-12-webview-dom"
microsoft_alias: ""
featured_image: ""
categories: []
tags: ["r3p0", "webview"]
ai_note: "AI-assisted issue specification and local verification status."
summary: "Plain-text webview UI and validated message pump; hosted verification remains pending."
post_date: "2026-10-20"
---

## 12: Webview DOM: transcript, composer and the message pump

**Iteration:** 1 (Walking skeleton)

## Description
The framework-free webview: `main.ts` wires `acquireVsCodeApi()` → `parseHostMessage` → the reducer from #11 → render functions. The transcript shows plain text for now (markdown comes in #21). The composer is a textarea plus a Send button (Enter sends, Shift+Enter adds a new line). On load, it posts `ready`. Rendering only touches the DOM it owns, uses `textContent` (never `innerHTML` with model text), and is tested with happy-dom using a fake `acquireVsCodeApi`.

## Tests to write first
*(`test/webview/transcript.test.ts`, `composer.test.ts`, `main.test.ts`, all happy-dom)*
- `renders user and assistant turns in order`
- `assistant text is set with textContent, so <script> appears as text`
- `a streaming turn shows a typing indicator`
- `Enter posts send with the trimmed text and clears the textarea`
- `Shift+Enter inserts a newline and does not send`
- `Send is disabled when the text is empty or the input is disabled`
- `main posts ready on load`
- `main ignores host messages that fail parseHostMessage`
- `the unsent draft is kept in vscode.setState and restored on reload`

## Implementation tasks
- [x] `src/webview/main.ts`, `view/transcript.ts`, `view/composer.ts`
- [x] `src/webview/styles.css` using only `--vscode-*` theme variables
- [x] `test/webview/fakeVsCodeApi.ts`

## Local verification

Implementation and window-free happy-dom tests are local. Tests cover the
listed behaviours plus invalid and oversized sends, UTF-8 byte boundaries,
input gating, literal errors, selected-tab isolation, host updates and disposal.
The message pump starts only with `#r3p0-root`; #13 supplies that HTML/channel
and #14 supplies controller/simulated-budget wiring. The installed placeholder
is unchanged. No real Q0T4 or model requests are made.

Red-first command:

```sh
npm test -- --project dom test/webview/transcript.test.ts test/webview/composer.test.ts test/webview/main.test.ts
```

Before implementation, the existing empty entry point failed 21 behavioural
tests, while one placeholder-preservation test passed. The composer and
transcript suites could not load their not-yet-created production modules.
The same command passes all 54 tests after implementation. The full coverage
run passes 496 unit/DOM tests; the webview has 100% line and branch coverage.
Typechecks, lint, formatting, the build and VSIX packaging also pass locally.
The packaged production JS/CSS were read back and the compiled message/draft
lifecycle was exercised in happy-dom. Hosted CI, installed styling and native
keyboard editing remain unverified locally; no GUI tests were launched.

## Acceptance criteria
- [ ] The listed tests pass, and CI is green

## Depends on
#11

## Labels
`feature`

## Estimate
M
