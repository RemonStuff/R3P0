import { SendError } from "../../src/core/budget/sendError";
import type {
  Availability,
  BudgetSnapshot,
  BudgetUnit,
  ChatMessage,
  ModelRef,
  Reply,
  ReplyOutcome,
  SendFailure,
  SpendDecision,
  Usage,
  UsageChange,
} from "../../src/core/types";
import type { BudgetPort } from "../../src/ports/BudgetPort";
import type { CancellationSignal } from "../../src/ports/CancellationSignal";
import type { ClockPort } from "../../src/ports/ClockPort";
import { Emitter } from "./emitter";

/** One scripted answer to `send`. */
export interface ReplyScript {
  readonly chunks?: readonly string[];
  readonly cost?: number;
  readonly unit?: BudgetUnit;
  readonly borrowed?: number;
  /** Q0T4 cuts the stream off at the budget after the chunks. */
  readonly stop?: "budget";
  /** Rejects before the first chunk. */
  readonly reject?: SendFailure;
  /** Fails after this many chunks: the stream ends and the outcome is `failed`. */
  readonly failAfter?: number;
  readonly failMessage?: string;
  /** Waits this long on the clock before each chunk. */
  readonly delayMs?: number;
}

interface SendCall {
  readonly subject: string;
  readonly model: ModelRef;
  readonly messages: readonly ChatMessage[];
}

const key = (subject: string) => subject.toLowerCase();

/**
 * A scripted BudgetPort, so R3P0 can be built before Q0T4's API exists.
 * Reserve approval works like Q0T4 #57: in "ask" mode a subject is refused with
 * `needs-reserve-approval` until `allowReserve`, which lasts until the week ends.
 */
export class FakeBudget implements BudgetPort {
  readonly calls = {
    check: [] as { subject: string; estimate: { inputTokens: number; model?: string } }[],
    send: [] as SendCall[],
    allowReserve: [] as string[],
  };

  private readonly clock: ClockPort;
  private replies: ReplyScript[] = [];
  private checks: SpendDecision[] = [];
  private snapshot: BudgetSnapshot | undefined;
  private state: Availability = { state: "ready", degraded: [] };
  private readonly needsApproval = new Set<string>();
  /** subject → when the grant expires (ms), or Infinity. */
  private readonly grants = new Map<string, number>();
  private weekEnd = Number.POSITIVE_INFINITY;
  private reserveCommandAvailable = true;
  private readonly usage = new Emitter<UsageChange>();
  private readonly availabilityChanges = new Emitter<Availability>();
  readonly onDidChangeUsage = this.usage.event;
  readonly onDidChangeAvailability = this.availabilityChanges.event;

  constructor(options: { clock: ClockPort }) {
    this.clock = options.clock;
  }

  // ── Scripting ──────────────────────────────────────────────────────────────

  scriptReply(script: ReplyScript): void {
    this.replies.push(script);
  }

  scriptCheck(decision: SpendDecision): void {
    this.checks.push(decision);
  }

  setStatus(snapshot: BudgetSnapshot | undefined): void {
    this.snapshot = snapshot;
  }

  setAvailability(availability: Availability): void {
    this.state = availability;
    this.availabilityChanges.fire(availability);
  }

  emitUsageChanged(change: UsageChange): void {
    this.usage.fire(change);
  }

  /** `subject` is over its weekly budget and Q0T4 is in "ask" mode. */
  requireReserveApproval(subject: string): void {
    this.needsApproval.add(key(subject));
  }

  /** When reserve grants expire (the week's reset). Unset means never. */
  setWeekEnd(iso: string): void {
    this.weekEnd = Date.parse(iso);
  }

  /** Simulates Q0T4 without the `q0t4.allowReserve` command. */
  setReserveCommandAvailable(available: boolean): void {
    this.reserveCommandAvailable = available;
  }

  // ── BudgetPort ─────────────────────────────────────────────────────────────

  availability(): Availability {
    return this.state;
  }

  async status(): Promise<BudgetSnapshot | undefined> {
    return this.snapshot && structuredClone(this.snapshot);
  }

  async check(
    subject: string,
    estimate: { readonly inputTokens: number; readonly model?: string },
  ): Promise<SpendDecision> {
    this.calls.check.push({ subject, estimate: { ...estimate } });
    const scripted = this.checks.shift();
    if (scripted) return scripted;
    const reserve = this.reserveState(subject);
    if (reserve === "needs-approval") return needsApproval(subject);
    return {
      kind: "allowed",
      remaining: 1_000_000,
      wouldBorrow: reserve === "granted",
      unit: "tokens",
    };
  }

  async send(
    request: { subject: string; model: ModelRef; messages: readonly ChatMessage[] },
    signal: CancellationSignal,
  ): Promise<Reply> {
    this.calls.send.push({
      subject: request.subject,
      model: { ...request.model },
      messages: request.messages.map((m) => ({ ...m })),
    });
    if (this.reserveState(request.subject) === "needs-approval") {
      throw new SendError(needsApproval(request.subject));
    }
    const script = this.replies.shift() ?? {};
    if (script.reject) throw new SendError(script.reject);
    return this.stream(script, signal);
  }

  async allowReserve(subject: string): Promise<boolean> {
    this.calls.allowReserve.push(subject);
    if (!this.reserveCommandAvailable) return false;
    this.grants.set(key(subject), this.weekEnd);
    return true;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private reserveState(subject: string): "not-needed" | "needs-approval" | "granted" {
    if (!this.needsApproval.has(key(subject))) return "not-needed";
    const expires = this.grants.get(key(subject));
    return expires !== undefined && this.clock.now().getTime() < expires
      ? "granted"
      : "needs-approval";
  }

  private stream(script: ReplyScript, signal: CancellationSignal): Reply {
    const usage: Usage = {
      cost: script.cost ?? 0,
      unit: script.unit ?? "tokens",
      borrowed: script.borrowed ?? 0,
    };
    let settle!: (outcome: ReplyOutcome) => void;
    const outcome = new Promise<ReplyOutcome>((resolve) => (settle = resolve));
    const clock = this.clock;
    const chunks = script.chunks ?? [];

    async function* generate(): AsyncGenerator<string> {
      for (const [index, chunk] of chunks.entries()) {
        if (script.failAfter === index) {
          settle({ status: "failed", message: script.failMessage ?? "Scripted failure", usage });
          return;
        }
        if (script.delayMs) await wait(clock, script.delayMs, signal);
        if (signal.isCancellationRequested) {
          settle({ status: "stopped-by-user", usage });
          return;
        }
        yield chunk;
      }
      // A consumer that cancels after the last chunk still stopped the reply.
      if (signal.isCancellationRequested) settle({ status: "stopped-by-user", usage });
      settle({ status: script.stop === "budget" ? "stopped-by-budget" : "complete", usage });
    }

    return { chunks: generate(), outcome };
  }
}

function needsApproval(subject: string): SendFailure & { kind: "refused" } {
  return {
    kind: "refused",
    code: "needs-reserve-approval",
    message: `${subject} needs the reserve; allow it for this week first.`,
  };
}

/** Resolves after `ms` on the clock, or as soon as the signal is cancelled. */
function wait(clock: ClockPort, ms: number, signal: CancellationSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = clock.setTimeout(done, ms);
    const cancellation = signal.onCancellationRequested(done);
    function done() {
      timer.dispose();
      cancellation.dispose();
      resolve();
    }
  });
}
