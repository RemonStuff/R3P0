# R3P0

**One chat per repo, metered through Q0T4.**

R3P0 is a VS Code extension that gives you a separate chat for every repository in your workspace. In a multi-root workspace with 7 repos open, R3P0 shows 7 chat tabs, plus an **Overview** tab with every repo's budget. Each tab only sees files from its own repo.

R3P0 never calls a language model itself. Every request goes through **[Q0T4](https://github.com/RemonStuff/Q0T4)**, the extension that gives each repo a weekly budget (and, optionally, a share of a monthly GitHub AI Credits pool with a reserve). So all R3P0 tabs, and `@q0t4` in Copilot Chat, share the same budgets:

- each tab header shows that repo's weekly budget and a warning when it runs low
- when a repo's budget is spent, its input is disabled with an explanation
- when a repo needs the reserve and Q0T4 is set to ask first, R3P0 shows **Allow reserve for ‹repo› this week**
- without Q0T4 (or with an incompatible version), R3P0 refuses to send and explains why

## Status

🚧 **In development: iteration 0 (test harness).** There's nothing to try in VS Code yet. The plan is in [docs/PLAN.md](docs/PLAN.md), and progress is tracked in [docs/ROADMAP.md](docs/ROADMAP.md) and on the [R3P0 Roadmap board](https://github.com/users/RemonStuff/projects/2).

| Done | What                                                                                   |
| ---- | -------------------------------------------------------------------------------------- |
| ✅   | Project scaffold with the same tooling as Q0T4 (#1)                                    |
| ✅   | Vitest unit tests, happy-dom webview tests, and a 90% coverage gate on `src/core` (#2) |
| ✅   | Ports, domain types and the Q0T4 API contract types (#3)                               |

## Requirements

- VS Code 1.104 or newer
- [Q0T4](https://github.com/RemonStuff/Q0T4) with its public API (Q0T4 v1.0, planned for the VS Code Marketplace; until then from its `.vsix`). Q0T4 needs GitHub Copilot Chat. R3P0 hands Q0T4 the model you pick, so the first request asks for language-model consent in R3P0's name.

## How to use

_Not installable yet._ From iteration 0's last issue (#8) on, every iteration produces a `.vsix`:

1. Download `r3p0-*.vsix` from the latest CI run (later: from GitHub Releases).
2. Install it with **Extensions: Install from VSIX…** or `code --install-extension r3p0-<version>.vsix`.
3. Open the **R3P0** view from the activity bar. You can drag it next to Copilot Chat in the secondary sidebar.

## Development

Requires Node 24 and npm 11.

```sh
npm ci
npm test            # unit tests (node) and webview DOM tests (happy-dom)
npm run coverage    # fails below 90% line or branch coverage on src/core
npm run lint        # includes the ban on vscode imports in core, ports and webview
npm run typecheck   # extension and webview
npm run build       # dist/extension.js and dist/webview.js
```

Press **F5** in VS Code to start an Extension Development Host with R3P0 loaded.

The project is strictly test-driven (red → green → refactor), with all logic in `src/core` behind ports. See [docs/PLAN.md §8](docs/PLAN.md#8-testing-strategy).
