import type {
  Availability,
  BudgetSnapshot,
  ChatMessage,
  ModelRef,
  Reply,
  SpendDecision,
  UsageChange,
} from "../core/types";
import type { CancellationSignal } from "./CancellationSignal";
import type { Disposable } from "./Disposable";

/**
 * Everything R3P0 needs from Q0T4, in R3P0's own terms. Implemented by
 * `core/budget/q0t4Budget` over Q0T4's client (#30), and by `SimulatedBudget`
 * in development (#14). Every model request goes through `send`.
 */
export interface BudgetPort {
  availability(): Availability;
  onDidChangeAvailability(listener: (availability: Availability) => void): Disposable;

  /** Q0T4's status snapshot, or `undefined` when it isn't available (degraded). */
  status(): Promise<BudgetSnapshot | undefined>;

  /** Pre-check through Q0T4's `canSpend`; `inputTokens` is R3P0's estimate. */
  check(
    subject: string,
    estimate: { readonly inputTokens: number; readonly model?: string },
  ): Promise<SpendDecision>;

  /**
   * Sends one metered request. Rejects before the first chunk with an error
   * carrying a `SendFailure`; a budget cut-off mid-stream is an outcome, not a rejection.
   */
  send(
    request: {
      readonly subject: string;
      readonly model: ModelRef;
      readonly messages: readonly ChatMessage[];
    },
    signal: CancellationSignal,
  ): Promise<Reply>;

  /** Allows `subject` to borrow from the reserve for the rest of the week (Q0T4 #57). */
  allowReserve(subject: string): Promise<boolean>;

  onDidChangeUsage(listener: (change: UsageChange) => void): Disposable;
}
