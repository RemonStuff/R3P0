# 32: Q0T4 unavailable: refuse, explain, Show Q0T4

**Iteration:** 4 (Q0T4 integration)

## Description
When availability isn't `ready`, **every** tab and the Overview show a banner with the explanation from #29 and a **Show Q0T4** button, and every input is disabled. The button posts `showQ0T4`, and the host runs `extension.open` with `RemonStuff.q0t4`. If that command fails, it falls back to `workbench.extensions.search` with `@id:RemonStuff.q0t4`. The banner disappears as soon as availability becomes `ready`.

## Tests to write first
*(unit: controller)*
- `availability change posts an availability message to the webview`
- `send while not ready never calls BudgetPort.send and posts the explanation`
- `showQ0T4 calls UiPort.openExtension with RemonStuff.q0t4`
- `becoming ready re-enables input on every tab`

*(DOM)*
- `the banner shows the message and a Show Q0T4 button on every tab`
- `inputs are disabled while unavailable`
- `clicking Show Q0T4 posts showQ0T4`

*(integration)*
- `without-q0t4: send through the test API posts the missing explanation`
- `showQ0T4 opens the extensions view without throwing`

## Implementation tasks
- [ ] Protocol: `availability`, `showQ0T4` (with parser tests)
- [ ] `src/webview/view/banner.ts`
- [ ] `UiPort.openExtension` in `vscodeUi`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#28, #31

## Labels
`feature`

## Estimate
S
