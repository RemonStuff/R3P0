# 01: Project scaffold

**Iteration:** 0 (Test harness)

## Description
Create the extension project with **the same tooling and versions as Q0T4** (`package.json` @ `ef19933`): TypeScript `~6.0.3`, esbuild `^0.28.2`, ESLint `^10.13.0` + typescript-eslint `^8.71.2`, Prettier `^3.9.10`, `@types/node ^22.20.5`, `@types/vscode 1.104.0`, `engines.vscode ^1.104.0`, and the same strict `tsconfig.json`, `.editorconfig`, `.gitattributes`, `.prettierrc.json` and `.vscodeignore`. R3P0 adds one thing Q0T4 doesn't have: a **second esbuild entry** for the webview (`src/webview/main.ts` → `dist/webview.js`, `platform: "browser"`, `format: "iife"`).

Set up the ports-and-adapters boundary from day one: `src/core`, `src/ports` and `src/webview` can't import `vscode`, and `src/webview` can't import `src/adapters` or `src/extension.ts`.

## Tests to write first
*(`test/unit/tooling/architecture.test.ts`, the same approach as Q0T4)*
- `lint fails when a file in src/core imports vscode`
- `lint fails when a file in src/core type-imports vscode`
- `lint fails when a file in src/ports imports vscode`
- `lint fails when a file in src/webview imports vscode`
- `lint fails when a file in src/webview imports from src/adapters`
- `lint passes when a file in src/adapters imports vscode`
- `typecheck rejects implicit any` (fixture `test/lint-fixtures/implicit-any.ts`)
- `build emits dist/extension.js (cjs, node) and dist/webview.js (iife, browser)`

## Implementation tasks
- [ ] Set the git identity repo-locally: `RemonStuff <203449353+RemonStuff@users.noreply.github.com>`
- [ ] `package.json`: `name: "r3p0"`, `publisher: "RemonStuff"`, `engines.vscode: "^1.104.0"`, categories `AI` and `Chat`, the same scripts as Q0T4 (`build`, `watch`, `lint`, `typecheck`, `format`, `format:check`), **no** `extensionDependencies`
- [ ] `tsconfig.json` copied from Q0T4. The webview gets `tsconfig.webview.json` with `lib: ["ES2022", "DOM"]`
- [ ] `esbuild.mjs` with two entry points
- [ ] `eslint.config.mjs` with the `noVscode` rule for core/ports/webview, plus a `no-restricted-imports` pattern rule for webview → adapters
- [ ] `.editorconfig`, `.gitattributes`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `.vscodeignore`, `.vscode/launch.json` + `tasks.json` (copied from Q0T4)
- [ ] `src/extension.ts` with empty `activate`/`deactivate`, and `src/webview/main.ts` empty

## Acceptance criteria
- [ ] The listed tests pass (they run fully once #02 is in)
- [ ] `npm run lint`, `npm run typecheck` and `npm run build` succeed on Windows with Node 24 / npm 11
- [ ] Manual: F5 starts an Extension Development Host with R3P0 loaded

## Depends on
—

## Labels
`infra`

## Estimate
M
