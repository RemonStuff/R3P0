# 12: Webview DOM: transcript, composer and the message pump

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
- [ ] `src/webview/main.ts`, `view/transcript.ts`, `view/composer.ts`
- [ ] `src/webview/styles.css` using only `--vscode-*` theme variables
- [ ] `test/webview/fakeVsCodeApi.ts`

## Acceptance criteria
- [ ] The listed tests pass, and CI is green

## Depends on
#11

## Labels
`feature`

## Estimate
M
