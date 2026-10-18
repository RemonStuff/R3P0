# R3P0 ↔ Q0T4 API contract

This is exactly what R3P0 relies on from Q0T4's public API (`apiVersion: 1`), and how R3P0 behaves when any part of it is missing.

> **Source:** Q0T4 [PLAN §9.8](https://github.com/RemonStuff/Q0T4/blob/main/docs/PLAN.md#98-public-api) and issues [#63](https://github.com/RemonStuff/Q0T4/blob/main/docs/issues/63-public-api-facade.md), [#64](https://github.com/RemonStuff/Q0T4/blob/main/docs/issues/64-api-send-request.md), [#65](https://github.com/RemonStuff/Q0T4/blob/main/docs/issues/65-api-contract-tests.md) and [#57](https://github.com/RemonStuff/Q0T4/blob/main/docs/issues/57-reserve-borrowing.md), at Q0T4 `main` @ `ff0e4d2`.
>
> **Status:** Q0T4 has **planned** the API (its iteration 9, the last one before v1.0) but hasn't built it. Wherever Q0T4's plan names a type without spelling it out, the shape below is R3P0's **provisional reading**, marked *(provisional)*, and the gap is filed in [Q0T4-REQUESTS.md](Q0T4-REQUESTS.md). When Q0T4 publishes `src/api.d.ts` (#63), R3P0 copies it in and a type-level test checks R3P0's types against it.

## 1. How R3P0 reaches the API

```ts
const ext = vscode.extensions.getExtension("RemonStuff.q0t4");
const api = ext && (await ext.activate());        // activate() handles activation order
const result = guardQ0T4Api(api);                  // pure core; never trusts the shape
const client = api.forExtension("RemonStuff.r3p0"); // ledger source "api:RemonStuff.r3p0"
```

- There's no `extensionDependencies` (see [PLAN §2.3](PLAN.md#23-how-r3p0-depends-on-q0t4-a-runtime-check-not-extensiondependencies)).
- R3P0 re-runs this on `vscode.extensions.onDidChange`.
- R3P0 identifies itself with its own extension ID. Q0T4 trusts the self-declared ID (§9.8).

## 2. Types R3P0 relies on

Q0T4's API uses `vscode` types. R3P0's core and ports can't import `vscode`, so `src/ports/q0t4Api.ts` declares the contract **generically** over the VS Code types. The adapter (`src/adapters/q0t4Types.ts`) instantiates it with the real `vscode` types. That keeps the logic in pure, coverage-gated core (issue 30).

```ts
// As in Q0T4 §9.8
interface Q0T4Api {
  readonly apiVersion: 1;
  forExtension(extensionId: string): Q0T4Client;
}

interface Q0T4Client {
  getStatus(): Promise<StatusSnapshot>;
  canSpend(subject: string, estimate: { inputTokens: number; model?: string }): Promise<SpendCheck>;
  sendRequest(
    subject: string,
    model: vscode.LanguageModelChat,                       // from R3P0's own selectChatModels
    messages: vscode.LanguageModelChatMessage[],
    options: vscode.LanguageModelChatRequestOptions | undefined,
    token: vscode.CancellationToken,
  ): Promise<MeteredResponse>;
  readonly onDidChangeUsage: vscode.Event<UsageChange>;
}

// As in Q0T4 #63
interface SpendCheck {
  allowed: boolean;
  remaining: number;
  wouldBorrow: boolean;
  unit: "tokens" | "credits";
  reason?: string;                                          // values not yet enumerated (R2)
}
interface UsageChange { subject: string; source: string; cost: number }

// As in Q0T4 #64
interface MeteredResponse {
  stream: AsyncIterable<string>;                            // guarded text parts
  text: Promise<string>;                                    // "the full text" (provisional: Promise assumed)
  result: Promise<{ cost: number; stopped: false | "budget" | "cancelled"; borrowed: number }>; // provisional "stopped" union
}
interface Q0T4BudgetError extends Error {                   // sendRequest rejects with this before calling the model
  code: "over-budget" | "blocked" | "no-prices" | "needs-reserve-approval";
  // "carrying the refusal details": fields not yet specified (R2); R3P0 reads these if present:
  subject?: string; used?: number; budget?: number; resetsAt?: string; unit?: "tokens" | "credits";
}

// (provisional) Q0T4 #61 lists the content of StatusSnapshot but not its shape (R1)
interface StatusSnapshot {
  unit: "tokens" | "credits";
  cycle?: { start: string; end: string };                   // pool mode
  reserve?: { size: number; borrowed: number; untrackedCharged: number; remaining: number };
  prices?: { fetchedAt: string; source: string; stale: boolean };
  subjects: {
    subject: string;
    weeklyBudget: number;
    weeklyUsed: number;
    resetsAt: string;
    monthlyShare?: number;                                  // pool mode
    cycleUsed?: number;                                     // pool mode
    pace?: number;                                          // "pace (×)"
    isDefault: boolean;
  }[];
}
```

### What R3P0 uses each member for

| Member | Used for | When |
|---|---|---|
| `apiVersion` | Accepting the API at all (must be exactly `1`) | Each time the locator runs |
| `forExtension("RemonStuff.r3p0")` | Getting the client. Usage is attributed as `api:RemonStuff.r3p0`. | Once per `ready` |
| `client.sendRequest` | **Every** model request. R3P0 has no other path to a model. | Each send |
| `client.canSpend(subject, { inputTokens, model: model.name })` | Pre-check before sending. `inputTokens` is R3P0's estimate (`chars / 4 × 1.1`), so R3P0 never calls `countTokens`. Q0T4 counts exactly inside `sendRequest`. `wouldBorrow` shows a "will borrow from the reserve" note. | Each send |
| `client.getStatus()` | Tab headers, warning and exhausted states, the Overview (weekly, monthly share, pace, reserve, cycle), stale-price hints, the status bar | On start, after every request, on `onDidChangeUsage` (debounced 250 ms) |
| `client.onDidChangeUsage` | Live updates in every tab, including usage from `@q0t4` and other windows | Subscribed while `ready` |
| Command `q0t4.allowReserve` | The **Allow reserve for ‹repo› this week** button after a `needs-reserve-approval` refusal. The grant lasts for that subject and week (Q0T4 #57). Its arguments aren't specified yet (R3). | On click |

### How R3P0 maps Q0T4's answers

| Q0T4 | R3P0 shows |
|---|---|
| `sendRequest` rejects with `over-budget` | A refusal ("‹repo› has used its weekly budget…"), and the input is disabled until usage changes |
| `blocked` (`unallocatedSubjects: "block"`) | "Q0T4 has no budget for ‹repo›", plus **Open Q0T4 settings** |
| `no-prices` (credits mode, no price table) | "Q0T4 has no model prices yet", plus **Refresh model prices** (if Q0T4 exposes the command, R4) |
| `needs-reserve-approval` (`reserveMode: "ask"`) | **Allow reserve for ‹repo› this week** → runs `q0t4.allowReserve` → re-sends the same request |
| `result.stopped === "budget"` | "⛔ Stopped: weekly budget reached", keeping the partial text |
| A rejection with a `vscode.LanguageModelError` (`NoPermissions`, `NotFound`, `Blocked`) | A model error: consent hint + Retry, "pick another model", or "blocked" (issue 44) |
| `canSpend` → `allowed: false` | The same as the matching rejection, without starting a request |
| `canSpend` → `wouldBorrow: true` | A small "will borrow from the reserve" note on the turn |

### Consequences of Q0T4's choices for R3P0

- **Model objects and consent:** R3P0 passes the `LanguageModelChat` it selected itself, so the **language-model consent dialog is R3P0's** (Q0T4 §9.8). R3P0 still never calls `model.sendRequest` or `model.countTokens` itself. Only Q0T4's pipeline does, and an architecture test enforces this.
- **Core stays pure:** core works with `ModelRef { vendor, id }` and plain `{ role, content }` messages. The adapter turns them into a `LanguageModelChat` (re-selected by `{ vendor, id }`) and `LanguageModelChatMessage.User/Assistant`, and links an `AbortSignal` to a `CancellationTokenSource`.
- **Borrow approval is per subject and week, not per request** (Q0T4 #57). Once granted, later requests on that repo borrow without asking until the week ends.

## 3. Behaviour when something is missing or wrong

R3P0 checks at runtime and never trusts the types. `guardQ0T4Api` is pure and unit tested (issue 29).

| Situation | Availability | What the user sees | Sending |
|---|---|---|---|
| Q0T4 isn't installed or is disabled | `missing` | "R3P0 sends every request through Q0T4, so it can't chat without it. Install or enable Q0T4." + **Show Q0T4** | Refused |
| `activate()` throws (for example, Copilot Chat is missing) | `activation-failed` | "Q0T4 is installed but couldn't start: ‹error›." + **Show Q0T4** | Refused |
| `exports` is `undefined` or not an object (a Q0T4 from before the API) | `incompatible` | "This Q0T4 version has no public API. Update Q0T4." + **Show Q0T4** | Refused |
| `apiVersion` is missing or ≠ `1` | `version-mismatch` | "R3P0 needs Q0T4 API version 1 but found ‹n›. Update R3P0 or Q0T4." + **Show Q0T4** | Refused |
| `forExtension` is missing, throws, or returns a client without `sendRequest` | `incompatible` | As above, listing what's missing | Refused |
| `getStatus` is missing | `ready` (degraded) | Headers show "Budget unavailable". The Overview explains why. The input isn't pre-disabled, and refusals come from `sendRequest`. | Allowed (Q0T4 still meters) |
| `canSpend` is missing | `ready` (degraded) | No pre-check. Refusals come from `sendRequest`. | Allowed |
| `onDidChangeUsage` is missing | `ready` (degraded) | Refreshes `getStatus` after each of its own requests and every 60 s while visible | Allowed |
| `getStatus` has no entry for a repo | — | "No budget info for ‹subject› yet" (R5) | Allowed |
| An unknown error `code`, `reason` or `stopped` value | — | "Q0T4 refused: ‹message›", or "Stopped" | — |
| The `q0t4.allowReserve` command doesn't exist | — | The reserve button opens Q0T4 instead, with a hint | — |
| Any API call throws or rejects unexpectedly | stays `ready` | The turn is `failed` with the message. Status calls retry on the next trigger. | — |
| Q0T4 is uninstalled or disabled while R3P0 runs | → `missing` | In-flight streams are cancelled, and every tab shows the unavailable state | Refused |

There's **never** a fallback that calls a model without Q0T4.

## 4. How the contract is tested

- `FakeQ0T4Api` implements `Q0T4Api` (with `forExtension` recording the ID), with switches to remove members, change `apiVersion`, script `Q0T4BudgetError` codes, and simulate `q0t4.allowReserve` grants per subject and week.
- `budgetPortContract` runs against `FakeBudget` and `Q0T4Budget(FakeQ0T4Api)`.
- `q0t4ApiShape.contract.test.ts` covers every row of §3.
- In integration tests, the **fake Q0T4 extension** (`test/fixtures/fake-q0t4`, ID `RemonStuff.q0t4`) exports `FakeQ0T4Api` and registers a fake `q0t4.allowReserve` command. The configs `without-q0t4` and `q0t4-api-v2` cover the refusal rows.
- Once Q0T4 publishes `src/api.d.ts`, a type-level test checks `src/adapters/q0t4Types.ts` against a copy of it in `test/contract/q0t4-api.d.ts`, recording the Q0T4 commit.
- **Never** against the real Q0T4 in automated tests. R3P0 iteration 4 ends with a manual check against a real Q0T4 build once Q0T4's iteration 9 has shipped.
