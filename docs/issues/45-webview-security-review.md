# 45: Webview security review (CSP, XSS, links)

**Iteration:** 7 (Hardening and release)

## Description
A focused review of the webview's attack surface, with every finding fixed test-first. It checks that the CSP from #13 is unchanged and complete, that no `innerHTML` is used with untrusted strings (lint rule `no-restricted-properties` for `innerHTML`/`outerHTML`/`insertAdjacentHTML` in `src/webview`, except the markdown renderer's output), that markdown can't inject HTML, that only `http(s)` links can be opened, that command URIs are disabled, that `localResourceRoots` contains only `dist`, and that every inbound message is validated. The results are written up in `docs/security.md`.

## Tests to write first
*(DOM: `test/webview/xss.test.ts`, an `it.each` over a hostile corpus)*
- `<script> in markdown renders as text`
- `<img onerror> in markdown renders as text`
- `[x](javascript:alert(1)) is not a link`
- `[x](command:workbench.action.reloadWindow) is not a link`
- `a data:text/html link is not a link`
- `HTML entities and zero-width tricks in a link target are not a link`
- `a folder name with markup is shown as text in the tab strip and header`

*(unit)*
- `buildWebviewHtml snapshot: the CSP string matches the reviewed policy`
- `openLink allows only http and https`

*(architecture)*
- `lint fails on innerHTML in src/webview outside markdown.ts`
- `webview options: enableCommandUris is false and localResourceRoots is dist only` (integration)

## Implementation tasks
- [ ] Add the lint rule
- [ ] `docs/security.md` (threat model, the decisions, the checks)
- [ ] Fix any finding, each with a failing test first

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: paste the hostile corpus as a SIMULATED reply and see no script run and no CSP violation in Developer Tools

## Depends on
#28

## Labels
`test`

## Estimate
S
