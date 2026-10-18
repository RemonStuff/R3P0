# 19: Webview tab strip

**Iteration:** 2 (One tab per repo)

## Description
The tab strip in the webview: Overview first, then one tab per repo, labelled as decided in #16, with the tooltip as the `title` attribute. It follows the WAI-ARIA tabs pattern (`role="tablist"` / `tab` / `tabpanel`, arrow keys, Home/End), and it scrolls horizontally when the tabs overflow. A streaming tab shows a spinner dot. Selecting a tab posts `selectTab`. The reducer handles the `tabs` message, and the protocol gains `tabs` and `selectTab` (test-first in `core/protocol`).

## Tests to write first
*(unit: reducer)*
- `tabs message replaces the tab list and keeps the active tab when it still exists`
- `tabs message falls back to Overview when the active tab disappeared`

*(DOM, happy-dom)*
- `renders Overview first then repo tabs in order`
- `the active tab has aria-selected=true and the others false`
- `clicking a tab posts selectTab with its key`
- `ArrowRight / ArrowLeft move focus and wrap; Home / End jump`
- `the tooltip is the title attribute`
- `a streaming tab shows the busy indicator`
- `a tab label is set as text, so markup in a folder name is not interpreted`

## Implementation tasks
- [ ] Protocol: `tabs`, `selectTab` (with parser tests)
- [ ] `src/core/ui` reducer cases
- [ ] `src/webview/view/tabStrip.ts` + CSS

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#11, #12, #16

## Labels
`feature`

## Estimate
M
