// Q0T4's public API, as R3P0 relies on it (docs/Q0T4-API-CONTRACT.md §2,
// following Q0T4 PLAN §9.8 at ff0e4d2). Q0T4's API uses vscode types, which
// ports can't import, so the contract is generic over them; the adapter
// `q0t4Types.ts` fills them in with the real ones.
//
// Shapes Q0T4 names but hasn't spelled out yet are marked "provisional"
// (Q0T4-REQUESTS R1, R2). When Q0T4 publishes src/api.d.ts, they're checked against it.

import type { Disposable } from "./Disposable";

/** The vscode types Q0T4's API is written in. */
export interface Q0T4Types {
  Model: unknown;
  Message: unknown;
  Options: unknown;
  Token: unknown;
}

/** Structural `vscode.Event<T>`. */
export type Q0T4Event<T> = (listener: (e: T) => unknown) => Disposable;

export interface Q0T4Api<T extends Q0T4Types> {
  readonly apiVersion: 1;
  /** Binds calls to the consuming extension; Q0T4's ledger source becomes `api:<extensionId>`. */
  forExtension(extensionId: string): Q0T4Client<T>;
}

export interface Q0T4Client<T extends Q0T4Types> {
  getStatus(): Promise<StatusSnapshot>;
  canSpend(subject: string, estimate: { inputTokens: number; model?: string }): Promise<SpendCheck>;
  sendRequest(
    subject: string,
    model: T["Model"],
    messages: T["Message"][],
    options: T["Options"] | undefined,
    token: T["Token"],
  ): Promise<MeteredResponse>;
  readonly onDidChangeUsage: Q0T4Event<UsageChange>;
}

/** Q0T4 #63. `reason` values aren't enumerated yet (R2). */
export interface SpendCheck {
  allowed: boolean;
  remaining: number;
  wouldBorrow: boolean;
  unit: "tokens" | "credits";
  reason?: string;
}

/** Q0T4 #63. */
export interface UsageChange {
  subject: string;
  source: string;
  cost: number;
}

/** Q0T4 #64. Provisional: `text` as a promise, and the `stopped` values (R1). */
export interface MeteredResponse {
  stream: AsyncIterable<string>;
  text: Promise<string>;
  result: Promise<{ cost: number; stopped: false | "budget" | "cancelled"; borrowed: number }>;
}

/**
 * Q0T4 #64: `sendRequest` rejects with this before calling the model.
 * Provisional: the detail fields (R2); R3P0 reads them only if present.
 */
export interface Q0T4BudgetError extends Error {
  code: "over-budget" | "blocked" | "no-prices" | "needs-reserve-approval";
  subject?: string;
  used?: number;
  budget?: number;
  resetsAt?: string;
  unit?: "tokens" | "credits";
}

/** Provisional: Q0T4 #61 lists the content but not the shape (R1). */
export interface StatusSnapshot {
  unit: "tokens" | "credits";
  cycle?: { start: string; end: string };
  reserve?: { size: number; borrowed: number; untrackedCharged: number; remaining: number };
  prices?: { fetchedAt: string; source: string; stale: boolean };
  subjects: {
    subject: string;
    weeklyBudget: number;
    weeklyUsed: number;
    resetsAt: string;
    monthlyShare?: number;
    cycleUsed?: number;
    pace?: number;
    isDefault: boolean;
  }[];
}
