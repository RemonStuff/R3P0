# Manual testing

## Iteration 0: install the placeholder

Requires VS Code 1.104 or newer. Q0T4 and GitHub Copilot are not required for this placeholder. No model is called.

1. Download and extract the `r3p0-vsix` artifact from the CI run for the revision you want. To build locally instead, use Node 24 and npm 11, then run `npm ci` and `npm run package`.
2. In VS Code, run **Extensions: Install from VSIX...** and select `r3p0-0.0.1.vsix`. Alternatively, run `code --install-extension r3p0-0.0.1.vsix`.
3. Open a folder or a multi-root workspace.
4. Select the **R3P0** speech-bubble icon in the activity bar.
5. Confirm the view says **R3P0 isn't wired yet** and explains that chat and Q0T4 are not connected.
6. Drag the view into the secondary sidebar. Confirm the same placeholder appears.
7. Close and reopen the view, then run **Developer: Reload Window**. Confirm the view still opens without errors.

There is no chat input yet. Sending messages, repo tabs and budgets arrive in later iterations.

## Automated checks

`npm run test:integration` opens the actual view in three isolated VS Code configurations: fake Q0T4 v1, no Q0T4, and fake Q0T4 v2. It checks the contributions, activation, test-mode API, placeholder HTML, nonce-based content security policy and local bundle URI.

`npm test -- test/unit/tooling/package.test.ts` builds both bundles and checks `vsce ls`. The package must include the activity-bar icon and both bundles, without source files, tests, build tooling or source maps.

The test API exposes the resolved view only in `ExtensionMode.Test`. Normal installed and development instances do not export it. The richer channel/controller API comes with the walking skeleton.
