# 08: Stub R3P0 view and an installable `.vsix`

**Iteration:** 0 (Test harness) 🎯 **Install and try**

## Description
Contribute the R3P0 view container (activity bar) and the webview view `r3p0.chat`. The view shows a static "R3P0 isn't wired yet" page served under a strict CSP. This proves packaging, activation, the webview bundle and the CSP end to end, and gives iteration 0 something to install. In `ExtensionMode.Test`, `activate()` returns a stub **test API**. This issue also starts `docs/manual-testing.md`.

## Tests to write first
*(integration)*
- `R3P0 activates when the r3p0.chat view is opened`
- `the r3p0 view container and r3p0.chat view are contributed`
- `activate returns a test API object in test mode`
- `the package contains dist/extension.js and dist/webview.js and no src/ or test/` (checks `vsce ls`)

## Implementation tasks
- [ ] `contributes.viewsContainers.activitybar` (`r3p0`, with an icon) and `contributes.views.r3p0` (`r3p0.chat`, `type: "webview"`)
- [ ] `activationEvents`: `onView:r3p0.chat`, `onStartupFinished`
- [ ] A minimal `WebviewViewProvider` that sets placeholder HTML (the real HTML builder comes in #13)
- [ ] `docs/manual-testing.md` with the iteration 0 checklist

## Acceptance criteria
- [ ] The listed tests pass, and CI is green, including the `package` job
- [ ] Manual: install the CI `.vsix` with `code --install-extension`. The R3P0 icon appears in the activity bar, the view opens and shows the placeholder, and you can drag it to the secondary sidebar

## Depends on
#06, #07

## Labels
`infra`

## Estimate
S
