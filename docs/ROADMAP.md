# R3P0: Roadmap

See [PLAN.md](PLAN.md) for the architecture and testing rules, and [Q0T4-API-CONTRACT.md](Q0T4-API-CONTRACT.md) for what R3P0 needs from Q0T4. Each issue is in [issues/](issues/).

Every iteration ends with **CI green** and a **`.vsix` you can install** (downloaded from the CI artifact) and try by following `docs/manual-testing.md`.

**Progress:** iteration 0 is complete (01–08). CI runs on every push and PR. Next: #09 protocol messages and validators, starting iteration 1's walking skeleton. Ticked items name the PR that merged them.

## Iterations

| # | Iteration | What you can try at the end | Issues |
|---|---|---|---|
| 0 | Test harness | An R3P0 icon in the activity bar opens a placeholder view (strict CSP) | [01](issues/01-project-scaffold.md), [02](issues/02-vitest-dom-and-coverage.md), [03](issues/03-ports-and-domain-types.md), [04](issues/04-fake-budget.md), [05](issues/05-other-fakes.md), [06](issues/06-integration-runner-and-fake-q0t4.md), [07](issues/07-ci-workflow.md), [08](issues/08-stub-view-and-vsix.md) |
| 1 | Walking skeleton | One chat tab that streams a SIMULATED reply (no model is called). Without the dev setting, sending is refused with an explanation | [09](issues/09-protocol-messages.md), [10](issues/10-chat-session-core.md), [11](issues/11-webview-state-reducer.md), [12](issues/12-webview-dom-transcript-and-composer.md), [13](issues/13-webview-html-csp-and-channel.md), [14](issues/14-simulated-budget-and-skeleton-wiring.md) |
| 2 | One tab per repo | Overview plus one tab per workspace folder, named `owner/repo`-style as Q0T4 would, added and removed live | [15](issues/15-repo-identity.md), [16](issues/16-reconcile-tabs-and-labels.md), [17](issues/17-repo-discovery-adapter.md), [18](issues/18-session-manager.md), [19](issues/19-webview-tab-strip.md), [20](issues/20-wire-tabs.md) |
| 3 | The chat experience | Markdown with code blocks and Copy, Stop, a model picker, history that survives reloads, New conversation | [21](issues/21-markdown-rendering.md), [22](issues/22-streaming-render.md), [23](issues/23-stop-button.md), [24](issues/24-model-picker.md), [25](issues/25-history-store.md), [26](issues/26-build-messages.md), [27](issues/27-new-conversation-and-restore.md), [28](issues/28-wire-chat-experience.md) |
| 4 | Q0T4 integration | Real metering through Q0T4: an API version check, an unavailable banner with Show Q0T4, blocked input, the "Allow reserve for ‹repo› this week" prompt and live updates | [29](issues/29-q0t4-api-guard.md), [30](issues/30-q0t4-budget-adapter.md), [31](issues/31-q0t4-locator.md), [32](issues/32-unavailable-state-ui.md), [33](issues/33-refusals-and-blocked-input.md), [34](issues/34-reserve-borrow-prompt.md), [35](issues/35-live-usage-updates.md), [36](issues/36-wire-q0t4.md) |
| 5 | Budget visibility | A budget header per tab, the Overview (weekly, monthly share, pace, reserve), a status bar summary and a view badge | [37](issues/37-budget-display-state.md), [38](issues/38-tab-budget-headers.md), [39](issues/39-overview-tab.md), [40](issues/40-status-bar-and-view-badge.md) |
| 6 | Repo-scoped context | Attach files from the tab's own repo only | [41](issues/41-repo-path-scoping.md), [42](issues/42-repo-file-picker.md), [43](issues/43-attachments-in-chat.md) |
| 7 | Hardening and release | Friendly errors everywhere, a reviewed CSP and XSS defences, accessibility, README, a release `.vsix` | [44](issues/44-error-paths.md), [45](issues/45-webview-security-review.md), [46](issues/46-accessibility-and-theming.md), [47](issues/47-readme-and-release.md) |

**Totals:** 47 issues, 28 S and 19 M, none L.

**Changes to the suggested order, and why:**
- **A simulated budget in iteration 1** (no model at all, Development and Test mode only from iteration 4 on) makes iterations 1–3 installable **before Q0T4's API exists**, without ever bypassing metering.
- **The real `BudgetPort` adapter is pure core** (#30), so it can be built and contract-tested against `FakeQ0T4Api` as soon as #29 is done. It doesn't have to wait for the rest of iteration 3. Only the wiring (#36) waits.
- **CSP comes first** (#13 in iteration 1), not only in the review at the end. #45 *reviews* it and adds the hostile corpus.
- **Repo identity is contract-tested in iteration 2** (#15), before any tab can charge a subject.

## Dependency graph (by iteration)

```
it0: 01 ─┬─ 02 ─┬─ 04 ─────────────┐
         └─ 03 ─┼─ 05              │
                └─ 06 ─ 07 ─ 08    │
it1: 03 → 09 → 11 → 12;  04,05,09 → 10;  08,09 → 13;  10,12,13 → 14
it2: 03 → 15 → 16;  06,15 → 17;  10,16 → 18;  11,12,16 → 19;  14,17,18,19 → 20
it3: 12 → 21 → 22;  18 → 23;  18,19 → 24;  05 → 25 → 26;  18,25 → 27;  21,22,23,24,26,27 → 28
it4: 03 → 29;  04,06,29 → 30;  06,29 → 31;  28,31 → 32;  28,30 → 33 → 34;  30 → 35;  32,33,34,35 → 36
it5: 30 → 37;  36,37 → 38, 39;  38,39 → 40
it6: 15 → 41 → 42;  26,28,42 → 43
it7: 36 → 44;  28 → 45;  40 → 46;  43,44,45,46 → 47
```

## Checklist (dependency order)

Each issue depends only on lower-numbered issues, so working top to bottom is always valid. Issues marked ∥ can be done in parallel with the one above.

### Iteration 0: Test harness
- [x] 01 Project scaffold ✅ PR #49
- [x] 02 Vitest, DOM tests and enforced core coverage (needs 01) ✅ PR #50
- [x] 03 Port interfaces, domain types and Q0T4 contract types (needs 01) ∥ ✅ PR #52
- [x] 04 `FakeBudget`, `FixedClock` and the `BudgetPort` contract suite (needs 02, 03) ✅ PR #53
- [x] 05 The remaining fakes (needs 02, 03) ∥ ✅ PR #54
- [x] 06 Integration runner, `FakeQ0T4Api` and the fake Q0T4 extension (needs 02, 03) ∥ ✅ PR #55
- [x] 07 GitHub Actions CI (needs 02, 06) ✅ PR #56
- [x] 08 Stub view and `.vsix` (needs 06, 07). 🎯 **Install and try** ✅ PR #58

### Iteration 1: Walking skeleton
- [ ] 09 Protocol messages and validators (needs 03)
- [ ] 10 `ChatSession` core (needs 04, 05, 09)
- [ ] 11 Webview state reducer (needs 09) ∥
- [ ] 12 Webview DOM: transcript and composer (needs 11)
- [ ] 13 Webview HTML/CSP and the channel adapter (needs 08, 09) ∥
- [ ] 14 Simulated budget and skeleton wiring (needs 10, 12, 13). 🎯 **Install and try**

### Iteration 2: One tab per repo
- [ ] 15 Repo identity with the Q0T4 contract test (needs 03)
- [ ] 16 Reconcile tabs and labels (needs 15)
- [ ] 17 Repo discovery adapter (needs 06, 15) ∥
- [ ] 18 `SessionManager` (needs 10, 16)
- [ ] 19 Webview tab strip (needs 11, 12, 16) ∥
- [ ] 20 Wire tabs (needs 14, 17, 18, 19). 🎯 **Install and try**

### Iteration 3: The chat experience
- [ ] 21 Markdown, code blocks and Copy (needs 12)
- [ ] 22 Smooth streaming render (needs 21)
- [ ] 23 Stop button (needs 18) ∥
- [ ] 24 Model catalog and picker (needs 18, 19) ∥
- [ ] 25 History store (needs 05) ∥
- [ ] 26 Build messages and trimming (needs 25)
- [ ] 27 New conversation and restore (needs 18, 25) ∥
- [ ] 28 Wire the chat experience (needs 21, 22, 23, 24, 26, 27). 🎯 **Install and try**

### Iteration 4: Q0T4 integration
- [ ] 29 Q0T4 API guard (needs 03; can start any time after iteration 0)
- [ ] 30 `Q0T4Budget` adapter (needs 04, 06, 29)
- [ ] 31 Q0T4 locator (needs 06, 29) ∥
- [ ] 32 Unavailable state UI (needs 28, 31)
- [ ] 33 Refusals and blocked input (needs 28, 30) ∥
- [ ] 34 Reserve prompt: allow the reserve for a repo this week (needs 33)
- [ ] 35 Live usage updates (needs 30) ∥
- [ ] 36 Wire Q0T4 (needs 32, 33, 34, 35). 🎯 **Install and try** (with a real Q0T4 `.vsix` once its API ships)

### Iteration 5: Budget visibility
- [ ] 37 Budget display state (needs 30)
- [ ] 38 Tab budget headers (needs 36, 37)
- [ ] 39 Overview tab (needs 36, 37) ∥
- [ ] 40 Status bar summary and view badge (needs 38, 39). 🎯 **Install and try**

### Iteration 6: Repo-scoped context
- [ ] 41 Repo path scoping (needs 15; can start any time after iteration 2)
- [ ] 42 Repo file picker (needs 41)
- [ ] 43 Attachments in the chat (needs 26, 28, 42). 🎯 **Install and try**

### Iteration 7: Hardening and release
- [ ] 44 Error paths (needs 36)
- [ ] 45 Webview security review (needs 28) ∥
- [ ] 46 Accessibility and theming (needs 40) ∥
- [ ] 47 README and release (needs 43, 44, 45, 46). 🎯 **Release candidate**

## Future iterations (out of scope for v1)
8 editing files from the chat · 9 tools (metered through Q0T4) · 10 agent mode · 11 syncing history across machines. See [PLAN §9](PLAN.md#9-out-of-scope-for-v1-possible-future-iterations).

## Definition of done (every issue)
0. The work is on its own branch (`<type>/<NN>-<short-title>`) and merged through a PR that says `Closes #NN`. Docs-only work uses `docs/<topic>` branches, which skip CI.
1. The tests under "Tests to write first" were committed **red** before the implementation
2. All tests are green, and core line and branch coverage is ≥ 90%
3. CI is green: lint, typecheck, unit + DOM (ubuntu and windows), integration (xvfb, all three configs), package
4. The manual checks in the issue are done, where the issue lists any
5. `README.md` is updated: what R3P0 is, its current status, and how to use what exists so far (every PR, including docs PRs)
6. `docs/ROADMAP.md` is updated: the issue is ticked with its PR number, and the progress line names the next issue (every PR)
