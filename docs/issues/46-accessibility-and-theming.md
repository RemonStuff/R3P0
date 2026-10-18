# 46: Accessibility and theming pass

**Iteration:** 7 (Hardening and release)

## Description
Make R3P0 usable from the keyboard and with a screen reader, and make it look right in light, dark and high-contrast themes. That means a visible focus ring, a logical tab order, `aria-live="polite"` for completed assistant replies (not every chunk), labelled buttons (Stop, Copy, Attach, Approve borrow), and colours only from `--vscode-*` variables. The view's `title`/`description` stay in sync.

## Tests to write first
*(DOM)*
- `every button has an accessible name`
- `a completed assistant turn is announced once through the aria-live region; chunks are not`
- `focus moves to the composer after selecting a tab`
- `the copy button is reachable by keyboard and announces "Copied"`
- `the stylesheet uses no hard-coded colours` (a test that scans `styles.css` for `#hex`/`rgb(`)

## Implementation tasks
- [ ] ARIA attributes and the live region
- [ ] A CSS pass for high-contrast themes (`--vscode-contrastBorder`)

## Acceptance criteria
- [ ] The listed tests pass, and CI is green
- [ ] Manual: use R3P0 with only the keyboard, and check it in Dark+, Light+ and High Contrast

## Depends on
#40

## Labels
`feature`

## Estimate
S
