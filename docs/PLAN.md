# R3P0: Plan

R3P0 is a VS Code extension that gives you **one chat per repo**. In a multi-root workspace with 7 repos open, R3P0 shows 7 chat tabs (plus an **Overview** tab), each one scoped to its own repo. R3P0 never talks to a language model itself: **every request goes through Q0T4's public API** (`sendRequest`), so all tabs share Q0T4's monthly pool, reserve and per-repo weekly budgets, and Q0T4's metering and cut-off apply to every token.

The project is test-driven throughout. This document covers the research, the decisions, the architecture, the data model, the protocol between the webview and the extension, the risks and the testing rules. The work itself is broken down in [ROADMAP.md](ROADMAP.md) and [issues/](issues/). What R3P0 expects from Q0T4 is in [Q0T4-API-CONTRACT.md](Q0T4-API-CONTRACT.md), and what Q0T4 still needs to add is in [Q0T4-REQUESTS.md](Q0T4-REQUESTS.md).

---

## 1. Research (`@types/vscode` 1.140.0, Q0T4 `main` @ `ef19933`)

### 1.1 Q0T4 as it stands

*First researched at `ef19933`; the API rows were updated for `ff0e4d2`, where Q0T4's PLAN §9 was published.*

| Item | What Q0T4's docs say | Consequence for R3P0 |
|---|---|---|
| Public API (`apiVersion: 1`, §9.8, issues #63–#65) | `activate()` returns `{ apiVersion: 1, forExtension(extensionId) }`. The `Q0T4Client` offers `getStatus()`, `canSpend(subject, { inputTokens, model? })`, `sendRequest(subject, model: LanguageModelChat, messages: LanguageModelChatMessage[], options, token)` → `{ stream, text, result }`, and `onDidChangeUsage`. Refusals reject with `Q0T4BudgetError` (`over-budget`, `blocked`, `no-prices`, `needs-reserve-approval`). **It's planned for Q0T4's iteration 9**, so it isn't built yet, and several types are named but not spelled out. | [Q0T4-API-CONTRACT.md](Q0T4-API-CONTRACT.md) follows §9.8 and marks provisional shapes. R3P0 builds against `FakeBudget` / `FakeQ0T4Api` until the real API ships. Gaps are in [Q0T4-REQUESTS.md](Q0T4-REQUESTS.md). |
| Model and consent (§9.8) | The consumer passes **its own** `LanguageModelChat`, so the language-model consent is the consumer's. | R3P0 selects the model object itself and hands it to Q0T4, but never calls `sendRequest` or `countTokens` on it (risk 3). |
| Reserve in `"ask"` mode (§9.3, #57) | A refusal, then **Allow reserve for ‹repo› this week** (`q0t4.allowReserve`) appends a `reserve-grant` for that subject and week. | R3P0 offers the same button. The grant is per repo per week, not per request (issue 34). |
| Distribution (#66) | Q0T4 v1.0 will be **published to the VS Code Marketplace**. | `extensionDependencies` would become possible, but R3P0 keeps the runtime check (§2.3). |
| Subject = repo | Issue 27: `origin` remote normalised to `owner/repo` → first remote → folder name → `undefined` (Q0T4 then uses `fallbackSubject`). It handles HTTPS, SSH, `ssh://`, `.git`, credentials, GitLab subgroups and Azure DevOps, and never includes the host. Subjects in settings match case-insensitively. | R3P0 implements the **same** rules in `core/repos` and runs the **same** case table as a contract test (§8.4). R3P0 always passes the subject explicitly, so Q0T4's `/use`, thread-subject and `fallbackSubject` steps don't apply. |
| Which folder | Issue 30: the folder of the active editor, then the first folder. Remotes come from the git repository **whose root contains that folder**. | R3P0 resolves **every** folder with the same "containing repository" rule, so a tab's subject is exactly what Q0T4 would choose with that folder active. |
| Ledger, pool, reserve, `reserveMode` | §4 and §9.2–§9.5: an append-only ledger, a monthly cycle with a rolling weekly budget per subject, a reserve with `reserveMode` `auto`/`ask`/`off` (default `ask`), and `unallocatedSubjects` `default`/`reserve`/`block`. | R3P0 shows only what `getStatus()` returns and never computes budgets itself. |
| Tooling | `package.json`: TypeScript `~6.0.3`, esbuild `^0.28.2`, ESLint `^10.13.0` + typescript-eslint `^8.71.2`, Prettier `^3.9.10`, Vitest `^5.0.5` + `@vitest/coverage-v8`, `@types/node ^22.20.5`, `@types/vscode 1.104.0`, `engines.vscode ^1.104.0`. Strict tsconfig (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `module: preserve` / `moduleResolution: bundler`, ESLint `no-restricted-imports` on `src/core` + `src/ports`, `vscode` aliased to a throwing module in Vitest. | R3P0 copies this setup and these versions exactly (issue 01) and adds only what a webview needs: a second esbuild entry, happy-dom and markdown-it. |
| Extension ID | `publisher: "RemonStuff"`, `name: "q0t4"` → `RemonStuff.q0t4` | `vscode.extensions.getExtension("RemonStuff.q0t4")` (IDs are case-insensitive). The fake Q0T4 used in tests reuses this ID. |
| Copilot dependency | Q0T4 keeps `extensionDependencies: ["github.copilot-chat"]`. | If Copilot Chat is missing, Q0T4 never activates, and R3P0 reports "Q0T4 couldn't start" (§5.3). |

### 1.2 VS Code APIs (checked in `@types/vscode` 1.140.0; all exist in 1.104)

| API | What it offers | What R3P0 does with it |
|---|---|---|
| `window.registerWebviewViewProvider(viewId, provider, { webviewOptions: { retainContextWhenHidden } })` | A webview inside a **statically declared** view (`contributes.views`, `type: "webview"`). `resolveWebviewView` runs when the view first becomes visible. `WebviewView` has `title`, `description`, `badge`, `visible`, `onDidChangeVisibility`, `onDidDispose`, `show()`. The view can live in the activity bar, the secondary sidebar or the panel, and the user can drag it between them. | One view, `r3p0.chat`, in R3P0's own view container. The **tabs are drawn inside the webview**. |
| `window.createWebviewPanel` + `registerWebviewPanelSerializer` | An editor-area tab with `title`, `iconPath`, `reveal`, `onDidDispose`, `onDidChangeViewState`. It survives reloads only through a serializer. | Not used in v1 (see the decision in §2.1). |
| `Webview` | `html`, `options` (`enableScripts`, `localResourceRoots`, `enableCommandUris`…), `postMessage(any): Thenable<boolean>`, `onDidReceiveMessage: Event<any>`, `asWebviewUri`, `cspSource`. **Messages are untyped** (`any`). A hidden webview without `retainContextWhenHidden` is **destroyed** and its scripts stop. In the webview, `acquireVsCodeApi()` gives `postMessage`, `getState` and `setState`. | All messages are validated by pure parsers (§4). The **extension host owns all state**, and the webview is a projection that asks for a full snapshot on `ready`. No `retainContextWhenHidden`. `setState` holds only cosmetic state (scroll position, the unsent draft). |
| Content Security Policy | `webview.cspSource` must be allowed for local scripts and styles. | `default-src 'none'; script-src 'nonce-…'; style-src ${cspSource}; font-src ${cspSource}; img-src ${cspSource} https: data:`. There's no `unsafe-inline` or `unsafe-eval`, and the HTML builder is pure and unit tested (issue 13). |
| `workspace.workspaceFolders`, `onDidChangeWorkspaceFolders({ added, removed })`, `getWorkspaceFolder(uri)` | Folders and their changes. Adding a folder to a **single-folder** window restarts the extension host, but adding one to a multi-root (`.code-workspace`) window doesn't. | `RepoDiscoveryPort` emits the full repo list on every change, and core diffs it (issue 16). |
| `extensions.getExtension<T>(id)` → `Extension<T>` (`isActive`, `exports`, `activate(): Thenable<T>`, `packageJSON`), `extensions.onDidChange` | `exports` is only valid after activation. `activate()` activates the extension on demand and resolves with its exports. `onDidChange` fires when extensions are installed, uninstalled, enabled or disabled. | The Q0T4 locator calls `activate()` itself, so activation order doesn't matter, and it re-checks on `onDidChange` (issue 31). |
| `lm.selectChatModels(selector?)`, `lm.onDidChangeChatModels`; `LanguageModelChat` (`id`, `name`, `vendor`, `family`, `version`, `maxInputTokens`) | Lists models without making a request. | `ModelCatalogPort` reads metadata. Core works with a `ModelRef { vendor, id }`. At send time, the Q0T4 adapter re-selects that model object and passes it to Q0T4's `sendRequest`, as §9.8 requires. R3P0 never calls `sendRequest` or `countTokens` on a model itself (risk 3 in §6). |
| Built-in git API: `extensions.getExtension<GitExtension>("vscode.git").exports.getAPI(1)` | `API.state` (`uninitialized` / `initialized`), `onDidChangeState`, `repositories`, `onDidOpenRepository`, `onDidCloseRepository`, `getRepository(uri)`. `Repository.rootUri`, `state.remotes: { name, fetchUrl?, pushUrl? }[]`, `state.onDidChange`. `GitExtension.enabled` + `onDidChangeEnablement`. | The adapter waits for `initialized` (with a timeout), maps each folder to the repository whose root contains it, and re-emits when repositories open or close or their remotes change. A minimal `git.d.ts` subset is copied in, like in Q0T4. |

---

## 2. Decisions

### 2.1 Panel or view? **A single webview view with tabs drawn inside it**

| Option | Pros | Cons |
|---|---|---|
| **A. One `WebviewView` (`r3p0.chat`) in R3P0's own activity-bar container, with tabs inside the webview** ✅ | Tabs can be created and removed freely, because views must be declared in `package.json` but webview content can change. One webview process for all repos. The user can drag the view to the secondary sidebar next to Copilot Chat, or into the panel. Hidden tabs cost nothing. | We draw the tab strip ourselves (keyboard, overflow, theming). |
| B. One `WebviewPanel` (editor tab) per repo | Native editor tabs. | Seven webviews (memory). They fight with your files for the editor area. The user can close a tab that R3P0 is supposed to manage. Restoring them needs a serializer per panel. |
| C. One `WebviewView` per repo | Native view titles and badges. | Views are **static** in `package.json`. You'd need N pre-declared slots hidden with `when` clauses, so it doesn't scale. |

**Decision: A.** The tab strip has **Overview** first, then one tab per repo in workspace-folder order. The view's `title` stays "R3P0", and its `description` shows the selected tab's repo. A later iteration could add "Open in editor" (option B for one repo) without changing core, because core doesn't care where the view lives.

### 2.2 What counts as "a repo"? **Each workspace folder**

- **One tab per workspace folder.** Its identity is resolved with Q0T4's rules: the git repository whose root contains the folder → `origin` → first remote → folder name.
- **Why not every repository the git extension finds?** Q0T4 resolves subjects per *workspace folder* (issue 30), so a nested repo or submodule inside a folder would get a tab whose subject Q0T4 itself would never pick, and its budget would never be charged consistently. Also, how many repos git finds depends on settings (`git.autoRepositoryDetection`, `git.repositoryScanMaxDepth`, `git.openRepositoryInParentFolders`) and on timing, so tabs would come and go.
- **Folders that aren't repos** still get a tab, named after the folder, because that's what Q0T4 does.
- **Two folders that resolve to the same `owner/repo`** (two clones or worktrees) get **two tabs**, because their files differ. They **share one budget**, because the subject is the same. Their labels are disambiguated with the folder name (decision 3 in §7).
- **Tab key ≠ subject.** A tab is keyed by its folder URI, so adding a remote later changes the label and subject but keeps the history.

### 2.3 How R3P0 depends on Q0T4: **a runtime check, not `extensionDependencies`**

`extensionDependencies: ["RemonStuff.q0t4"]` is the wrong tool here:
- **Until Q0T4 v1.0 is on the Marketplace** (Q0T4 #66), VS Code can't fetch the dependency. Installing R3P0 then fails or ends with an extension that **won't activate**. Either way R3P0 can't show its own explanation, which requirement 6 asks for.
- **Even after that,** disabling Q0T4 would silently disable R3P0 too, again without an explanation.
- It doesn't check `apiVersion` anyway.

Once Q0T4 is on the Marketplace, the **Show Q0T4** button opens its Marketplace page, so installing it is one click.

**Decision:** there's no `extensionDependencies`. On activation and on every `extensions.onDidChange`, the `q0t4Locator` adapter runs:
1. `getExtension("RemonStuff.q0t4")`. If it's missing → **`missing`**.
2. `await ext.activate()`, which also handles activation order. If that throws (for example, because Copilot Chat is missing) → **`activation-failed`**.
3. `guardQ0T4Api(exports)` in pure core. A missing or wrong `apiVersion` → **`version-mismatch`**. A missing `forExtension`, or a client without `sendRequest` → **`incompatible`**. Other missing client members → **`ready`** with degradations (see the contract).
4. **`ready`**: `exports.forExtension("RemonStuff.r3p0")` gives the client, and the real `BudgetPort` is built over it. Usage is recorded in Q0T4's ledger as `api:RemonStuff.r3p0`.

In every state except `ready`, sending is refused with an explanation and a **Show Q0T4** button, which runs the `extension.open` command with `RemonStuff.q0t4`. R3P0 activates `onView:r3p0.chat` / `onStartupFinished`. To work with remote development, R3P0 and Q0T4 must run in the same extension host, and both use the default (workspace) `extensionKind` (risk 9 in §6).

---

## 3. Architecture

Ports and adapters, the same as Q0T4. **All logic** lives in `src/core/` and never imports `vscode`. That includes the pure UI state used by the webview, the Q0T4 API guard and the `BudgetPort` implementation over Q0T4's API. ESLint `no-restricted-imports` enforces this for `src/core/**`, `src/ports/**` and `src/webview/**`. The webview bundle additionally can't import `src/adapters/**` or `src/extension.ts`.

```
src/
  core/                        pure, no vscode, ≥ 90% line + branch coverage
    repos/       normaliseRemote, repoIdentity (Q0T4 rules), reconcileTabs (diff), tabLabels (disambiguation)
    chat/        ChatSession (one per repo: idle → sending → streaming → done/stopped/failed),
                 SessionManager (sessions per tab key, active tab, close = cancel), ChunkBatcher (ClockPort)
    history/     schema v1, parseHistory (validate, migrate, quarantine corrupt), caps, HistoryStore
    messages/    buildMessages (repo preamble, history, attachments, prompt), estimateTokens, trimToWindow
    models/      chooseModel (remembered → previous → first), modelOptions for the picker
    budget/      guardQ0T4Api, Q0T4Budget (BudgetPort over a generic Q0T4Client; the adapter
                 injects model lookup, message conversion and tokens), budgetView (header and
                 warning state), overviewRows, refusal and reserve-grant view state
    context/     isInsideRepo (Windows casing, `..`, separators), attachment limits
    protocol/    PROTOCOL_VERSION, HostMessage / WebviewMessage types, parseWebviewMessage, parseHostMessage
    ui/          webview state reducer + selectors (pure, imported by the webview bundle)
    format/      every user-visible string: refusals, unavailable reasons, "112k / 150k", reset dates
    controller.ts    orchestrates the ports ↔ SessionManager ↔ protocol
    types.ts     domain types (RepoTab, Conversation, Turn, ModelRef, BudgetSnapshot…)
  ports/                       interfaces only, no vscode
    BudgetPort, RepoDiscoveryPort, ChatHistoryPort, ModelCatalogPort, WebviewChannelPort, ClockPort,
    RepoFilesPort (iteration 6), UiPort (status bar, commands, clipboard, external links),
    q0t4Api.ts   (the contract types from Q0T4-API-CONTRACT.md, generic over the vscode types)
  adapters/                    thin, no logic, covered by integration tests
    q0t4Locator, q0t4Types (the contract instantiated with vscode types; ModelRef → LanguageModelChat,
    plain messages → LanguageModelChatMessage, AbortSignal → CancellationToken),
    workspaceRepos (folders + vscode.git), workspaceStateHistory, lmModelCatalog,
    webviewViewChannel (WebviewViewProvider + HTML), systemClock, vscodeUi, repoFilePicker,
    simulatedBudget (no model at all; iterations 1–3, Development/Test mode only after iteration 4), git.d.ts
  webview/                     browser bundle (dist/webview.js), no vscode import
    main.ts      acquireVsCodeApi, message pump → core/ui reducer → render
    view/        DOM rendering: tabStrip, transcript, composer, modelPicker, budgetHeader, overview
    markdown.ts  markdown-it (html: false), code blocks, copy buttons
    styles.css   VS Code theme variables only
  extension.ts   composition root; in ExtensionMode.Test, activate() also returns a test API
test/
  unit/          Vitest (node), mirrors src/core
  webview/       Vitest + happy-dom, for src/webview
  fakes/         FakeBudget, FakeQ0T4Api, FakeRepoDiscovery, InMemoryHistory, FakeModelCatalog,
                 FakeWebviewChannel, FixedClock, FakeRepoFiles, FakeUi, each with its own tests
  contract/      shared suites: budgetPortContract(), repo-identity cases copied from Q0T4
  integration/   @vscode/test-cli suites
  fixtures/
    fake-q0t4/         test-only extension with ID RemonStuff.q0t4, exporting FakeQ0T4Api (bundled from test/fakes)
    fake-lm-provider/  test-only vendor "r3p0-test", so the model picker has models
    workspaces/        script that creates temporary git repos and a .code-workspace
```

### 3.1 Ports

| Port | Shape (summary) | Fake |
|---|---|---|
| `BudgetPort` | `availability(): Availability`; `onDidChangeAvailability`; `status(subjects): Promise<BudgetSnapshot>`; `check(subject, { inputTokens, model }): Promise<SpendDecision>`; `send({ subject, model: ModelRef, messages }, signal): Promise<Reply>` where `Reply = { chunks: AsyncIterable<string>; outcome: Promise<ReplyOutcome> }`; `allowReserve(subject): Promise<boolean>`; `onDidChangeUsage(cb)` | `FakeBudget` (scripted) |
| `RepoDiscoveryPort` | `current(): Promise<RepoInfo[]>` (`{ key, folderName, folderUri, remotes: { name, url }[] }` in folder order); `onDidChange(cb)` | `FakeRepoDiscovery` |
| `ChatHistoryPort` | `get(key): unknown`; `set(key, value): Promise<void>`; `keys(): readonly string[]` | `InMemoryHistory` (with injected write failures) |
| `ModelCatalogPort` | `list(): Promise<ModelInfo[]>` (`{ vendor, id, name, family, maxInputTokens }`); `onDidChange(cb)` | `FakeModelCatalog` |
| `WebviewChannelPort` | `post(msg: HostMessage): Promise<boolean>`; `onMessage(cb: (raw: unknown) => void)`; `onDidChangeVisibility(cb)`; `visible` | `FakeWebviewChannel` (records posts, injects raw messages) |
| `ClockPort` | `now(): Date`; `timeZone(): string`; `setTimeout(cb, ms): Disposable` (for batching and debouncing) | `FixedClock` (`advance(ms)` runs due timers) |
| `RepoFilesPort` *(iteration 6)* | `pick(repo): Promise<RepoFile[]>`; `read(repo, relPath, maxBytes)`; `realPath(uri)` | `FakeRepoFiles` |
| `UiPort` | `setStatusBar(state)`; `openExtension(id)`; `copy(text)`; `openExternal(href)`; `showError(text)` | `FakeUi` |

### 3.2 A request, end to end

1. The webview posts `send { tabKey, text, attachments }`. `parseWebviewMessage` validates it, and anything unknown or malformed is dropped and logged.
2. The `controller` finds the `ChatSession` for `tabKey`. If `BudgetPort.availability()` isn't `ready`, it posts the **unavailable** state and stops. If the session is already streaming, it ignores the message (one request in flight per tab).
3. `buildMessages`: a leading `user` preamble ("You are helping in repo `owner/repo` (folder `x`)…"), the conversation's completed turns, the attachments read through `RepoFilesPort` (only inside the repo), and the prompt. `trimToWindow` drops the oldest turns to fit `maxInputTokens` using a `chars / 4` estimate with a safety margin (Q0T4 does the exact counting).
4. `BudgetPort.check(subject, { inputTokens: estimate, model: model.name })` (Q0T4's `canSpend`):
   - `allowed` → continue, with a "will borrow from the reserve" note when `wouldBorrow` is set
   - `needs-reserve-approval` → post a **reserve prompt** ("Allow reserve for ‹repo› this week") and wait for `allowReserve`
   - any other refusal → post it, and keep the input disabled until usage changes
5. `BudgetPort.send(...)` with an `AbortSignal`-style signal that's linked to **Stop**, closing the tab and folder removal. The adapter re-selects the model object for the `ModelRef`, converts the messages, and calls Q0T4's `sendRequest`. A `Q0T4BudgetError` before the first chunk is handled like step 4, because the pre-check can race. Chunks go through `ChunkBatcher`, which flushes every 50 ms or 2 KB via `ClockPort`, and are posted as `chunk` messages.
6. `outcome` → the turn becomes `complete`, `stopped-by-user`, `stopped-by-budget` or `failed`, with `{ cost, unit, borrowed, model }`. It's persisted in `finally`, including on errors.
7. Q0T4 fires `onDidChangeUsage`, R3P0 refreshes `status(allSubjects)` (debounced 250 ms), and every tab header and the Overview update.

---

## 4. Webview ↔ extension protocol

The **extension host is the single source of truth.** The webview renders what it receives, keeps no business state, and can be destroyed at any time (when hidden). All types live in `core/protocol` and are shared by both bundles. Each message has `{ v: 1, type, … }`.

**Webview → host**

| `type` | Payload | Notes |
|---|---|---|
| `ready` | `{}` | Sent on every (re)load. The host answers with `snapshot`. |
| `selectTab` | `{ tabKey }` | `"overview"` or a folder key. Persisted as `ui.activeTab`. |
| `send` | `{ tabKey, text, attachmentIds }` | `text` is trimmed and must not be empty, at most 100 kB. |
| `stop` | `{ tabKey }` | |
| `newConversation` | `{ tabKey }` | |
| `pickModel` | `{ tabKey, model: { vendor, id } }` | |
| `allowReserve` / `declineReserve` | `{ tabKey, requestId }` | `allowReserve` grants the reserve for that repo for the rest of the week (Q0T4 #57), then re-sends the refused request. `requestId` stops a stale click from re-sending a different request. |
| `attach` / `removeAttachment` | `{ tabKey }` / `{ tabKey, attachmentId }` | Iteration 6. |
| `copy` | `{ text }` | Goes through the host, because clipboard access in webviews isn't reliable. |
| `openLink` | `{ href }` | Only `http(s):`. Anything else is dropped. |
| `showQ0T4` | `{}` | |

**Host → webview**

| `type` | Payload |
|---|---|
| `snapshot` | The full `ViewState`: tabs, active tab, each tab's transcript (the turns, plus a partial assistant text if one is streaming), model options, budget views, the overview, availability |
| `tabs` | `{ tabs: TabView[] }` (added, removed or relabelled) |
| `turnStarted` / `chunk` / `turnEnded` | `{ tabKey, turnId, … }`. `chunk` carries `text` (appended). `turnEnded` carries the status and usage. |
| `budget` | `{ views: Record<tabKey, BudgetView>, overview: OverviewView }` |
| `models` | `{ options, selected: Record<tabKey, ModelRef \| undefined> }` |
| `availability` | `{ state, message, canShowQ0T4 }` |
| `reservePrompt` | `{ tabKey, requestId, subject, reserveLabel? }` |
| `error` | `{ tabKey?, message }` |

**Ordering and loss:** `postMessage` to a hidden or destroyed webview resolves `false`. The host doesn't queue messages. When the webview comes back it sends `ready` and gets a fresh `snapshot`, which includes any partial stream. That keeps the protocol simple and correct across hide/show and reloads.

---

## 5. Data model

### 5.1 Tabs (in memory, derived)

```ts
type TabKey = string;                      // normalised folder URI, e.g. "file:///d%3A/Repos/Q0T4"
interface RepoTab {
  key: TabKey;
  subject: string;                         // "RemonStuff/Q0T4" or the folder name: exactly what goes to Q0T4
  identitySource: "origin" | "remote" | "folder";
  label: string;                           // "Q0T4", or "Q0T4 (Q0T4-worktree)" when ambiguous
  tooltip: string;                         // "RemonStuff/Q0T4 · D:\Repos\Q0T4"
  folderUri: string;
  order: number;                           // workspace folder index
}
```

`reconcileTabs(previous, discovered)` returns `{ tabs, added, removed, changed }`. It's pure and deterministic, and it keeps the active tab when possible.

### 5.2 Chat history (`workspaceState`)

Keys use the prefix `r3p0.` and are versioned:
- `r3p0.history.v1:<tabKey>`: one conversation per repo tab.
- `r3p0.ui.v1`: `{ activeTab, models: Record<tabKey, ModelRef> }`.

```json
{
  "v": 1,
  "conversationId": "c_2026-10-18T13:02:11Z_4f2a",
  "subject": "RemonStuff/Q0T4",
  "createdAt": "2026-10-18T13:02:11Z",
  "turns": [
    { "id": "t1", "role": "user", "text": "Explain esbuild.mjs", "attachments": [{ "path": "esbuild.mjs", "bytes": 526 }], "at": "…" },
    { "id": "t2", "role": "assistant", "text": "…markdown…", "status": "complete",
      "model": { "vendor": "copilot", "id": "gpt-5-mini", "name": "GPT-5 mini" },
      "usage": { "cost": 1840, "unit": "tokens" }, "at": "…" }
  ]
}
```

- `status` is one of `complete`, `stopped-by-user`, `stopped-by-budget`, `failed` or `interrupted`. A reply that was still streaming when VS Code closed is saved as `interrupted` on the next load.
- **Attachments are stored as references** (a repo-relative path and a size), never as content. Content is only sent with the turn it was attached to (decision 6 in §7).
- **Caps:** at most `r3p0.history.maxTurns` (default 100) turns and 512 kB per repo. The oldest turns are dropped first.
- **Corruption:** a value that fails validation is moved to `r3p0.history.corrupt.<timestamp>` and treated as empty. It never throws (the same policy as Q0T4).
- **New conversation** replaces the stored conversation. There's no archive in v1.
- `workspaceState` is per workspace and per machine, and isn't synced (sync is out of scope).

### 5.3 Availability (from the Q0T4 locator)

`ready` · `missing` · `activation-failed { error }` · `version-mismatch { found }` · `incompatible { missing: string[] }`. Each state has a fixed explanation in `core/format`.

---

## 6. Key technical risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Q0T4's API is planned but not built** (Q0T4 iteration 9), and some types are only named. | R3P0's provisional shapes may differ from what ships. | The contract follows §9.8 and marks every provisional shape. `FakeBudget`, `FakeQ0T4Api` and the shared `budgetPortContract` suite pin down R3P0's expectations. The logic is pure and generic over the vscode types, so a changed shape touches one module and its tests. When Q0T4 publishes `src/api.d.ts`, a type-level test checks R3P0's types against it. Iteration 4 includes a manual check against a real Q0T4 once the API ships (R13 asks for a pre-release). |
| 2 | **Repo identity drifts from Q0T4's.** | A tab charges the wrong subject, or another repo's budget. | The same rules, and the same case table (`test/contract/q0t4-repo-identity-cases.json`, copied from Q0T4 issue 27 with the source commit) run as a contract test. We ask Q0T4 to publish that table, and optionally a `subjectForFolder(uri)` helper (Q0T4-REQUESTS R7, R8). When the helper exists, R3P0 uses it and the contract test checks both agree. |
| 3 | **R3P0 hands its own `LanguageModelChat` to Q0T4** (§9.8), so the model's consent dialog is R3P0's, and R3P0 holds objects it could call directly. | A first request that fails on consent (`NoPermissions`), and a temptation to bypass metering. | Core only knows `ModelRef { vendor, id }`. The adapter re-selects the object right before each `sendRequest`, so it's never stored. `NoPermissions` shows a consent hint with Retry (issue 44). An architecture test forbids `.sendRequest(` and `.countTokens(` in `src/` outside the Q0T4 client call, and `canSpend` gets R3P0's estimate instead of a `countTokens` result. |
| 4 | **`extensionDependencies` on Q0T4** (`.vsix`-only until Q0T4 v1.0 is on the Marketplace). | It won't install or activate, and there's no explanation. | A runtime check (§2.3). An integration config **without** the fake Q0T4 proves the explanation shows up. |
| 5 | **Activation order and late installs.** | `exports` are read before Q0T4 has activated, or Q0T4 is installed after R3P0. | Always `await ext.activate()`. Re-check on `extensions.onDidChange`. Integration tests cover activating in either order. |
| 6 | **The webview is destroyed when hidden** (no `retainContextWhenHidden`). | Lost streams or a blank UI. | Host-owned state, `ready` → `snapshot`, and streams keep running in the host. Tested by simulating `ready` mid-stream. |
| 7 | **Streaming performance:** one `postMessage` per token, and re-rendering markdown on every chunk. | Jank with 7 tabs. | `ChunkBatcher` (50 ms or 2 KB). The webview renders on `requestAnimationFrame`, and only the active tab's transcript is re-rendered. |
| 8 | **XSS through model output** (markdown with HTML, links, code). | Script running in the webview. | markdown-it with `html: false` and its link validation. A strict CSP with a nonce, and no inline handlers. Links go through the host and only `http(s)` is allowed. Tests feed hostile markdown (issue 45). |
| 9 | **Remote development** (SSH, WSL, Codespaces): `exports` are only visible within the same extension host. | Q0T4 shows as "missing" in remote windows. | Both extensions keep the default workspace `extensionKind`. Q0T4 §9.8 assumes consumers run in its host. This is documented, and asked of Q0T4 (R14). |
| 10 | **The git API isn't ready, is disabled, or remotes change.** | A tab is named after the folder, then renamed. | Wait for `initialized` (with a timeout of about 3 s), then fall back to the folder name and update when remotes appear. The tab key is the folder, so history survives. The rename is visible and expected. |
| 11 | **Concurrent requests on the same subject** (two tabs for the same `owner/repo`, or `@q0t4` running at the same time). | Both pass the pre-check, and the budget is overshot. | One request in flight per tab in R3P0. Q0T4's ledger is safe with concurrent writers (§9.5), and its StreamGuard cuts each stream off. R9 asks Q0T4 to document how far two concurrent pre-checks can overshoot. |
| 12 | **`workspaceState` growth.** | A slow startup. | Caps (§5.2) and one key per repo. |
| 13 | **Adding the first extra folder to a single-folder window restarts the extension host.** | In-flight streams die. | The restarted session marks them `interrupted`. This is documented. |
| 14 | **API churn.** | Breakage. | Pin `engines.vscode` and `@types/vscode` to Q0T4's versions (`^1.104.0` / `1.104.0`), and keep every VS Code call in an adapter. |

---

## 7. Decisions and open questions

1. **Location** *(default, not explicitly confirmed)*: R3P0's own activity-bar container. You can drag it next to Copilot Chat in the secondary sidebar, or into the panel.
2. ✅ **Tab label: just the repo name** (`Q0T4`), with `owner/repo` in the tooltip and header. The only exception is two tabs with the same name (see 3), which get the folder name added: `Q0T4 (Q0T4-worktree)`.
3. ✅ **Two folders with the same subject: two tabs** that share one budget.
4. ✅ **Nested repositories and submodules:** no separate tabs in v1. There's one tab per workspace folder.
5. ✅ **Simulated budget:** works only in Development and Test mode from iteration 4 on (issue 36).
6. ✅ **Attachments are sent only with their own turn** in v1. Later turns don't re-read them.
7. ✅ **History:** one conversation per repo, at most 100 turns / 512 kB, and no archive for "New conversation".
8. ✅ **The model picker lists every model** from `selectChatModels()`, all vendors. Q0T4 meters them all: a model without a known price is costed at the most expensive rate, with a warning (Q0T4 §9.1).
9. ✅ **Status bar:** a **summary** item ("R3P0 ⚠ 2 ⛔ 1" → opens Overview), next to Q0T4's own item (issue 40).
10. ✅ **Bootstrapping `main`:** one empty "Initial commit" was pushed to `main` once, so the docs PR has a base.
11. ✅ **Distribution:** a `.vsix` from GitHub Releases. (Q0T4 has since decided to also publish v1.0 to the Marketplace, Q0T4 #66. R3P0 can follow later. That doesn't change §2.3.)

---

## 8. Testing strategy

### 8.1 Rules
- **Red → green → refactor.** For every behaviour: write a failing test, write the minimum code to pass it, then refactor. Commit at green. In each issue, the implementation tasks start only once the tests listed under "Tests to write first" are red. The branch history shows a red commit before the green one.
- **Ports and adapters.** Every decision lives in `src/core` and is unit tested. Adapters are thin and covered only by integration tests. `src/core`, `src/ports` and `src/webview` can't import `vscode` (ESLint plus a Vitest alias that throws). An architecture test proves the lint rule fires.
- **No real models, no real Q0T4.** Unit tests use `FakeBudget` / `FakeQ0T4Api`. Integration tests use the **fake Q0T4 extension** (with the same ID, `RemonStuff.q0t4`) and the fake LM provider (`r3p0-test`). A grep test fails if any test refers to `vendor: "copilot"` or installs `RemonStuff.q0t4` from anywhere other than `test/fixtures/fake-q0t4`.
- **R3P0 never calls a model.** A lint/grep test fails if `sendRequest(` or `countTokens(` appears in `src/` outside `core/budget/q0t4Budget.ts` (the call to Q0T4's `client.sendRequest`). R3P0 hands Q0T4 a model object (§9.8) but never calls one.
- **Bugs.** Every bug fix starts with a failing test that reproduces it. The bug issue template requires a link to that test.

### 8.2 Test doubles (`test/fakes/`, each with its own tests)
- **`FakeBudget`** (`BudgetPort`): scripted replies (a list of chunks, with an optional delay per chunk on `FixedClock`), scripted `check` decisions (`allowed`, `allowed` + `wouldBorrow`, refused with `over-budget` / `blocked` / `no-prices` / `needs-reserve-approval`), the same refusals as rejections of `send` before the first chunk, errors after chunk *n*, a mid-stream `stopped-by-budget` outcome, **reserve grants per subject and week** (`allowReserve` turns later `needs-reserve-approval` into `allowed` for that subject until the week ends on `FixedClock`), a scripted `status` snapshot, `emitUsageChanged(subject)`, `setAvailability(missing | activation-failed | version-mismatch | incompatible)`. It honours the cancel signal, and it records every `check`, `send` and `allowReserve` call. This is what lets R3P0 be built and tested **before Q0T4's API exists**.
- **`FakeQ0T4Api`** (`Q0T4Api` from Q0T4 §9.8): the same scripting, but shaped like Q0T4's exports: `forExtension(id)` (which records the ID) returns a client that rejects with `Q0T4BudgetError` codes, a scripted `StatusSnapshot` and `UsageChange` events, plus a fake `q0t4.allowReserve`. It has a configurable `apiVersion` and members that can be left out. It's generic over the model and message types, so unit tests use plain objects and the fixture extension uses real vscode ones. It's used to unit test `Q0T4Budget` and `guardQ0T4Api`, and it's **bundled into the fake Q0T4 extension** for the integration tests, so unit tests and integration tests script the same fake.
- **`FakeRepoDiscovery`**: a mutable repo list plus `emit()`.
- **`InMemoryHistory`**: a `ChatHistoryPort` backed by a `Map`. It returns deep copies and can inject write failures.
- **`FakeModelCatalog`**, **`FakeWebviewChannel`** (records posts, injects raw messages, toggles visibility), **`FakeRepoFiles`**, **`FakeUi`**.
- **`FixedClock`**: a fixed instant plus an IANA zone, with `advance(ms)` (which runs due timers in order) and `set(iso)`.
- Each fake declares `satisfies <Port>`, so drift from the port is a compile error.

### 8.3 Layers

| Layer | Tool | Scope | Target |
|---|---|---|---|
| Unit | Vitest (node) | `src/core/**`, `test/fakes/**`, the contract suites | < 5 s |
| DOM | Vitest + **happy-dom** (`// @vitest-environment happy-dom`) | `src/webview/**`: render functions, markdown, copy buttons, keyboard on the tab strip, the message pump with a fake `acquireVsCodeApi` | < 5 s |
| Integration | `@vscode/test-cli` + `@vscode/test-electron` | Activation, view registration, adapters, the fake Q0T4 end to end through the test API, multi-root add/remove, `workspaceState` persistence | < 3 min |
| Manual | Install the `.vsix` | One checklist per iteration in `docs/manual-testing.md`, updated in each iteration's last issue | |

**Integration configurations** (`.vscode-test.mjs`, each a labelled config):
- `with-q0t4`: R3P0 + `fake-q0t4` + `fake-lm-provider`, opening a generated `.code-workspace` with 3 temporary git repos (`origin` on GitHub, only `upstream`, and none) plus one plain folder.
- `without-q0t4`: R3P0 + `fake-lm-provider` only, which proves the `missing` state.
- `q0t4-api-v2`: `fake-q0t4` with `FAKE_Q0T4_API_VERSION=2` in the env, which proves `version-mismatch`.

Webviews can't be driven from tests, so in `ExtensionMode.Test` `activate()` returns a **test API** `{ channel, controller }`. Through it, tests inject webview messages and read posted host messages, just like Q0T4's test hook.

**Webview UI:** framework-free. The state reducer is pure and lives in `core/ui` (covered by the core gate). The DOM layer is a few render functions tested with happy-dom. The only runtime dependency is **markdown-it** (justified: writing a CommonMark parser is out of scope, it has no dependencies, and `html: false` plus `validateLink` cover the XSS surface).

### 8.4 Contract tests
- `test/contract/budgetPortContract.ts`: one suite (`describe.each`) run against `FakeBudget` **and** `Q0T4Budget(FakeQ0T4Api)`. If the fake drifts from the real adapter, it fails.
- `test/contract/repoIdentity.contract.test.ts`: runs the case table from Q0T4 issue 27 (`q0t4-repo-identity-cases.json`, recording the Q0T4 commit it was copied from) against `repoIdentity`.
- `test/contract/q0t4ApiShape.contract.test.ts`: `guardQ0T4Api` against the fixture exports (v1 complete, v1 with optional members missing, v2, `undefined`, a non-object).

### 8.5 Coverage
At least 90% line **and** branch coverage on `src/core/**` (Vitest v8 `thresholds`), and the run fails below that, locally and in CI. A fixture proves the gate fails (copied from Q0T4). `src/webview/**` coverage is reported but not gated.

### 8.6 CI (`.github/workflows/ci.yml`), on every push and pull request
1. `check` (ubuntu): `npm ci`, `npm run lint`, `npm run typecheck`, `npm run format:check`
2. `unit` (a matrix of ubuntu-latest and windows-latest, Node 24): `npm run coverage` (unit + DOM), uploading the report
3. `integration` (ubuntu): `xvfb-run -a npm run test:integration` (all three configs), caching `.vscode-test/`
4. `package` (needs the above): `npx @vscode/vsce package`, uploading `r3p0-*.vsix` as an artifact

Pushes to `docs/**` and PRs from `docs/**` skip every job (`branches-ignore` plus an `if: !startsWith(github.head_ref, 'docs/')` guard on each job), the same as Q0T4.

---

## 9. Out of scope for v1 (possible future iterations)

| Future iteration | What |
|---|---|
| 8 | **Editing files** from the chat (apply a code block as a diff, through `WorkspaceEdit` with a preview) |
| 9 | **Tools** (`vscode.lm.tools`, `invokeTool`), but only through a Q0T4 API that meters tool rounds |
| 10 | **Agent mode** (multi-step loops with tools and edits, with a budget for each run) |
| 11 | **Syncing history** across machines (`setKeysForSync` or a file in the repo) |
| — | Conversation archive and search, "Open tab in editor", nested-repo tabs, re-reading attachments in follow-ups |

---

## 10. Branches and pull requests

The same as Q0T4:
- **Every piece of work gets its own branch**, pushed and merged into `main` through a PR. Nothing is committed straight to `main`.
- Branches are named `<type>/<NN>-<short-title>` (`infra`, `feat`, `test`, `fix`), and docs work goes on `docs/<topic>`. The PR body says `Closes #NN`.
- **Stacked PRs:** retarget the upper PR to `main` before merging the lower one with `--delete-branch`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The git identity is set repo-locally to `RemonStuff <203449353+RemonStuff@users.noreply.github.com>`.
- `docs/**` branches contain no code and skip CI.
- **Every PR updates `README.md`**: the project description and how to use it, kept current with what the branch adds.
