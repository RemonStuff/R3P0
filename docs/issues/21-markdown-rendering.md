# 21: Markdown rendering with code blocks and a copy button

**Iteration:** 3 (The chat experience)

## Description
Assistant turns are rendered as markdown with **markdown-it** (the webview's only runtime dependency) configured with `html: false`, `linkify: true` and its default `validateLink`. Fenced code blocks are rendered as `<pre><code class="language-x">` with a header showing the language and a **Copy** button that posts `copy { text }` (the host writes to the clipboard through `UiPort`). Links don't navigate. Clicking one posts `openLink { href }`, and the host opens only `http(s):` links. User turns stay plain text.

## Tests to write first
*(DOM, happy-dom: `test/webview/markdown.test.ts`)*
- `renders headings, lists, emphasis and inline code`
- `raw HTML in markdown is escaped, not rendered` (`<img src=x onerror=alert(1)>`)
- `javascript: links are not rendered as links`
- `a fenced block renders a pre/code with the language class and a language label`
- `Copy posts copy with the exact code block text, without the label`
- `Copy shows "Copied" for 2 s` (fake timers)
- `clicking a link posts openLink and prevents navigation`
- `an unterminated fence still renders as a code block` (mid-stream)

*(unit: controller)*
- `copy calls UiPort.copy with the text`
- `openLink with https calls UiPort.openExternal`
- `openLink with file:, command: or javascript: is dropped`

## Implementation tasks
- [ ] Add `markdown-it` (and `@types/markdown-it`), bundled into `dist/webview.js`
- [ ] `src/webview/markdown.ts`, `view/codeBlock.ts`
- [ ] Protocol: `copy`, `openLink` (with parser tests)
- [ ] `UiPort.copy` / `openExternal` in `vscodeUi` (`env.clipboard`, `env.openExternal`)

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#12

## Labels
`feature`

## Estimate
M
