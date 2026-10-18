# R3P0 ↔ Q0T4 API contract

This is exactly what R3P0 relies on from Q0T4's public API (`apiVersion: 1`), and how R3P0 behaves when any part of it is missing.

> **Status: proposed.** Q0T4's PLAN.md announces the API ("§9") but doesn't specify it yet. The types below are what R3P0 is built and tested against (`src/ports/q0t4Api.ts`, `FakeQ0T4Api`, the fake Q0T4 extension). Anything Q0T4 still has to decide or add is in [Q0T4-REQUESTS.md](Q0T4-REQUESTS.md). When Q0T4 publishes §9, this file is updated to match, and every difference becomes an R3P0 issue that starts with a failing contract test.

## 1. How R3P0 reaches the API

```ts
const ext = vscode.extensions.getExtension<unknown>("RemonStuff.q0t4");
const exports = ext && (await ext.activate());   // activate() handles activation order
const result = guardQ0T4Api(exports);             // pure core; never trusts the shape
```

- There's no `extensionDependencies` (see [PLAN §2.3](PLAN.md#23-how-r3p0-depends-on-q0t4-a-runtime-check-not-extensiondependencies)).
- R3P0 re-runs this on `vscode.extensions.onDidChange`, for installs, uninstalls, enabling and disabling.
- R3P0 never imports Q0T4 code. It only uses the types below, as structural types.

## 2. Types R3P0 relies on (`src/ports/q0t4Api.ts`)

```ts
export interface Q0T4ApiV1 {
  readonly apiVersion: 1;                                                       // REQUIRED
  sendRequest(
    subject: string,
    model: Q0T4ModelRef,
    messages: readonly Q0T4Message[],
    options: Q0T4RequestOptions,
    token: Q0T4CancellationToken,
  ): Promise<Q0T4Response>;                                                     // REQUIRED
  getStatus?(query?: { subjects?: readonly string[] }): Promise<Q0T4Status>;     // optional for R3P0
  canSpend?(subject: string, estimate: Q0T4Estimate): Promise<Q0T4SpendDecision>; // optional for R3P0
  readonly onDidChangeUsage?: Q0T4Event<Q0T4UsageChange>;                        // optional for R3P0
}

/** The model is referenced, not passed: Q0T4 selects it with its own vscode.lm. */
export interface Q0T4ModelRef { vendor: string; id: string }

/** Plain JSON, with no vscode classes crossing the extension boundary. */
export interface Q0T4Message { role: "user" | "assistant"; content: string }

export interface Q0T4RequestOptions {
  /** true only after the user clicked "Approve borrow" for this request (reserveMode "ask"). */
  approveBorrow?: boolean;
  /** Caller tag for Q0T4's ledger, always "r3p0". */
  source?: string;
}

/** Structural; vscode.CancellationToken fits. */
export interface Q0T4CancellationToken {
  readonly isCancellationRequested: boolean;
  onCancellationRequested(listener: () => void): { dispose(): void };
}

export interface Q0T4Response {
  /** Visible text chunks, in order. Ends early when Q0T4 cuts off or the token is cancelled. */
  readonly text: AsyncIterable<string>;
  /** Settles after `text` ends (or fails); never rejects for a budget stop. */
  readonly result: Promise<Q0T4Result>;
}

export interface Q0T4Result {
  stopped: false | "budget" | "cancelled" | "error";
  cost: number;                       // in `unit`
  unit: "tokens" | "credits";
  model: { id: string; name: string };
  error?: { code: Q0T4ErrorCode; message: string };
}

export type Q0T4Estimate = { model: Q0T4ModelRef; messages: readonly Q0T4Message[] };

export type Q0T4SpendDecision =
  | { kind: "allowed"; remaining: number }
  | { kind: "needs-borrow"; shortfall: number; reserveRemaining: number }
  | { kind: "refused"; reason: Q0T4RefusalReason; resetsAt: string /* ISO */; message: string };

export type Q0T4RefusalReason = "weekly-exhausted" | "reserve-exhausted" | "context-too-long" | "model-not-supported";

/** sendRequest rejects (before the first chunk) with an Error that carries this. */
export interface Q0T4Error extends Error {
  code: Q0T4ErrorCode;
  decision?: Q0T4SpendDecision;       // set for "refused" and "borrow-required"
}
export type Q0T4ErrorCode =
  | "refused" | "borrow-required" | "model-not-found" | "no-permissions" | "blocked" | "unknown";

export interface Q0T4Status {
  unit: "tokens" | "credits";
  reserveMode: "off" | "ask" | "auto";
  generatedAt: string;                                          // ISO
  cycle?: { start: string; end: string };                       // pool mode only
  pool?: { total: number; reserve: { budget: number; used: number } };
  subjects: Q0T4SubjectStatus[];                                // one entry per requested subject, even with zero usage
}

export interface Q0T4SubjectStatus {
  subject: string;                                              // as requested (case kept)
  state: "ok" | "warning" | "exhausted";
  weekly: { used: number; budget: number; resetsAt: string };   // the enforced limit
  monthly?: { share: number; used: number };                    // pool mode only
  pace?: { expectedByNow: number; used: number };               // monthly pace
}

export interface Q0T4UsageChange { subjects?: readonly string[] } // undefined = anything may have changed
export type Q0T4Event<T> = (listener: (e: T) => void) => { dispose(): void };
```

### What R3P0 uses each member for

| Member | Used for | When |
|---|---|---|
| `apiVersion` | Accepting the API at all (must be exactly `1`) | Each time the locator runs |
| `sendRequest` | **Every** model request. R3P0 has no other path to a model. | Each send |
| `getStatus({ subjects })` | Tab header budgets, warning and exhausted states, the Overview (weekly, monthly share, pace, reserve), `reserveMode`, the status bar | On start, after every request, on `onDidChangeUsage` (debounced 250 ms) |
| `canSpend` | Pre-check before sending: whether to show the borrow prompt or a refusal without starting a request | Each send |
| `onDidChangeUsage` | Live updates in every tab, including usage from `@q0t4` in Copilot Chat and from other windows | Subscribed while `ready` |

R3P0 sets `options.source = "r3p0"` and `approveBorrow` only after an explicit click for that `requestId`.

## 3. Behaviour when something is missing or wrong

R3P0 checks at runtime and never trusts the types. `guardQ0T4Api` is pure and unit tested (issue 29).

| Situation | Availability | What the user sees | Sending |
|---|---|---|---|
| Q0T4 isn't installed or is disabled | `missing` | "R3P0 sends every request through Q0T4, so it can't chat without it. Install or enable Q0T4." + **Show Q0T4** | Refused |
| `activate()` throws (for example, Copilot Chat is missing) | `activation-failed` | "Q0T4 is installed but couldn't start: ‹error›." + **Show Q0T4** | Refused |
| `exports` is `undefined` or not an object | `incompatible` | "This Q0T4 version has no public API. Update Q0T4." + **Show Q0T4** | Refused |
| `apiVersion` is missing or ≠ `1` | `version-mismatch` | "R3P0 needs Q0T4 API version 1 but found ‹n›. Update R3P0 or Q0T4." + **Show Q0T4** | Refused |
| `sendRequest` isn't a function | `incompatible` | As above, listing the missing members | Refused |
| `getStatus` is missing | `ready` (degraded) | Headers show "Budget unavailable". The Overview explains why. The input is **not** pre-disabled, and refusals come from `sendRequest`. | Allowed (Q0T4 still meters) |
| `canSpend` is missing | `ready` (degraded) | No pre-check. A `borrow-required` rejection from `sendRequest` shows the borrow prompt, and a `refused` one shows the refusal. | Allowed |
| `onDidChangeUsage` is missing | `ready` (degraded) | R3P0 refreshes `getStatus` after each of its own requests and every 60 s while the view is visible | Allowed |
| `getStatus` omits a requested subject | — | That tab shows "No budget info for ‹subject›" | Allowed |
| An unknown `state` value | — | Treated as `warning` | — |
| An unknown `reserveMode` | — | Treated as `off` (no borrow button) | — |
| An unknown `stopped` or error `code` | — | Shown as "Stopped" or "Failed: ‹message›" | — |
| Any API call throws or rejects unexpectedly | stays `ready` | The turn is `failed` with the message. Status calls retry on the next trigger. | — |
| Q0T4 is uninstalled or disabled while R3P0 runs | → `missing` | In-flight streams are cancelled, and every tab shows the unavailable state | Refused |

There's **never** a fallback that calls a model directly.

## 4. How the contract is tested

- `FakeQ0T4Api` implements `Q0T4ApiV1`, with switches to remove members and change `apiVersion`.
- `budgetPortContract` runs against `FakeBudget` and against `Q0T4Budget(FakeQ0T4Api)`.
- `q0t4ApiShape.contract.test.ts` covers every row of §3.
- In integration tests, the **fake Q0T4 extension** (`test/fixtures/fake-q0t4`, ID `RemonStuff.q0t4`) exports `FakeQ0T4Api`, and the configs `without-q0t4` and `q0t4-api-v2` cover the refusal rows.
- **Never** against the real Q0T4 in automated tests. Iteration 4 ends with a manual check against a real Q0T4 `.vsix` once Q0T4's API is released.
