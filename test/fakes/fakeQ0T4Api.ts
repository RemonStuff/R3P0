import type { CancellationSignal } from "../../src/ports/CancellationSignal";
import type {
  MeteredResponse,
  Q0T4Api,
  Q0T4BudgetError,
  Q0T4Client,
  Q0T4Types,
  SpendCheck,
  StatusSnapshot,
  UsageChange,
} from "../../src/ports/q0t4Api";
import { Emitter } from "./emitter";

/** Plain stand-ins for the vscode types, for unit tests. */
export interface PlainQ0T4Types extends Q0T4Types {
  Model: { vendor: string; id: string };
  Message: string;
  Options: never;
  Token: CancellationSignal;
}

type BudgetErrorCode = Q0T4BudgetError["code"];

/** One scripted answer to `sendRequest`. Plain JSON, so commands can pass it. */
export interface FakeReply {
  chunks?: string[];
  cost?: number;
  borrowed?: number;
  stop?: "budget";
  reject?: { code: BudgetErrorCode; message?: string } & Partial<
    Pick<Q0T4BudgetError, "used" | "budget" | "resetsAt" | "unit">
  >;
}

/** Everything a test can script. Plain JSON, so `fake-q0t4.script` can pass it. */
export interface FakeQ0T4Script {
  replies?: FakeReply[];
  spend?: SpendCheck[];
  status?: StatusSnapshot;
  /** Subjects over budget in "ask" mode: refused until `allowReserve` for this week. */
  needsReserve?: string[];
  weekEndsAt?: string;
}

export interface FakeQ0T4Calls {
  extensionIds: string[];
  sendRequest: { subject: string; model: { vendor: string; id: string }; messages: string[] }[];
  canSpend: { subject: string; estimate: { inputTokens: number; model?: string } }[];
  allowReserve: string[];
}

type Member = "forExtension" | "getStatus" | "canSpend" | "sendRequest" | "onDidChangeUsage";

export interface FakeQ0T4Options<T extends Q0T4Types> {
  apiVersion?: unknown;
  /** Leaves members out, to simulate an incomplete API. */
  omit?: Member[];
  /** Simulates a Q0T4 from before the API: `exports` is undefined. */
  noApi?: boolean;
  now?: () => Date;
  /** How to read a model and a message; the defaults fit PlainQ0T4Types. */
  describeModel?: (model: T["Model"]) => { vendor: string; id: string };
  textOf?: (message: T["Message"]) => string;
}

class FakeBudgetError extends Error implements Q0T4BudgetError {
  override readonly name = "Q0T4BudgetError";
  constructor(
    readonly code: BudgetErrorCode,
    message: string,
    details: Partial<Q0T4BudgetError> = {},
  ) {
    super(message);
    Object.assign(this, details);
  }
}

const key = (subject: string) => subject.toLowerCase();

/**
 * A scripted Q0T4 public API (Q0T4 PLAN §9.8), generic over the vscode types.
 * Unit tests use it with plain types; test/fixtures/fake-q0t4 bundles it with
 * the real ones. It never calls the model it's given.
 */
export class FakeQ0T4Api<T extends Q0T4Types & { Token: CancellationSignal }> {
  private scripted: Required<Omit<FakeQ0T4Script, "status" | "weekEndsAt">> & FakeQ0T4Script = {
    replies: [],
    spend: [],
    needsReserve: [],
  };
  private recorded: FakeQ0T4Calls = emptyCalls();
  /** subject key → grant expiry (ms). */
  private grants = new Map<string, number>();
  private readonly usage = new Emitter<UsageChange>();
  private readonly now: () => Date;
  private readonly describeModel: (model: T["Model"]) => { vendor: string; id: string };
  private readonly textOf: (message: T["Message"]) => string;

  /** The typed API, with every member present. */
  readonly api: Q0T4Api<T>;
  /** What Q0T4's `activate()` would return, with `omit`, `apiVersion` and `noApi` applied. */
  readonly exports: unknown;

  constructor(private readonly options: FakeQ0T4Options<T> = {}) {
    this.now = options.now ?? (() => new Date());
    this.describeModel =
      options.describeModel ?? ((model) => model as unknown as { vendor: string; id: string });
    this.textOf = options.textOf ?? ((message) => String(message));
    this.api = { apiVersion: 1, forExtension: (id) => this.client(id) };
    this.exports = options.noApi ? undefined : this.buildExports();
  }

  // ── Test controls (also exposed as fake-q0t4.* commands) ───────────────────

  script(script: FakeQ0T4Script): void {
    this.scripted.replies.push(...(script.replies ?? []));
    this.scripted.spend.push(...(script.spend ?? []));
    this.scripted.needsReserve.push(...(script.needsReserve ?? []).map(key));
    if (script.status) this.scripted.status = script.status;
    if (script.weekEndsAt) this.scripted.weekEndsAt = script.weekEndsAt;
  }

  calls(): FakeQ0T4Calls {
    return structuredClone(this.recorded);
  }

  reset(): void {
    this.scripted = { replies: [], spend: [], needsReserve: [] };
    this.recorded = emptyCalls();
    this.grants.clear();
  }

  emitUsage(change: UsageChange): void {
    this.usage.fire(change);
  }

  /** What the `q0t4.allowReserve` command does (Q0T4 #57): a grant until the week ends. */
  allowReserve(subject: string): void {
    this.recorded.allowReserve.push(subject);
    const weekEnd = this.scripted.weekEndsAt
      ? Date.parse(this.scripted.weekEndsAt)
      : Number.POSITIVE_INFINITY;
    this.grants.set(key(subject), weekEnd);
  }

  // ── The API ────────────────────────────────────────────────────────────────

  private buildExports(): unknown {
    const omit = new Set(this.options.omit ?? []);
    const exports: Record<string, unknown> = {
      apiVersion: "apiVersion" in this.options ? this.options.apiVersion : 1,
    };
    if (!omit.has("forExtension")) {
      exports.forExtension = (id: string) => {
        const client: Record<string, unknown> = { ...this.client(id) };
        for (const member of omit) delete client[member];
        return client;
      };
    }
    return exports;
  }

  private client(extensionId: string): Q0T4Client<T> {
    this.recorded.extensionIds.push(extensionId);
    return {
      getStatus: async () =>
        structuredClone(this.scripted.status ?? { unit: "tokens", subjects: [] }),
      canSpend: async (subject, estimate) => {
        this.recorded.canSpend.push({ subject, estimate: { ...estimate } });
        const scripted = this.scripted.spend.shift();
        if (scripted) return scripted;
        const needsReserve = this.needsReserve(subject);
        return {
          allowed: !needsReserve,
          remaining: needsReserve ? 0 : 1_000_000,
          wouldBorrow: this.hasGrant(subject),
          unit: "tokens",
          ...(needsReserve ? { reason: "needs-reserve-approval" } : {}),
        };
      },
      sendRequest: async (subject, model, messages, _options, token) => {
        this.recorded.sendRequest.push({
          subject,
          model: { ...this.describeModel(model) },
          messages: messages.map((m) => this.textOf(m)),
        });
        if (this.needsReserve(subject)) {
          throw new FakeBudgetError(
            "needs-reserve-approval",
            `${subject} needs the reserve this week.`,
          );
        }
        const reply = this.scripted.replies.shift() ?? {};
        if (reply.reject) {
          const { code, message, ...details } = reply.reject;
          throw new FakeBudgetError(code, message ?? `Refused: ${code}`, details);
        }
        return respond(reply, token);
      },
      onDidChangeUsage: this.usage.event,
    };
  }

  private hasGrant(subject: string): boolean {
    const expires = this.grants.get(key(subject));
    return expires !== undefined && this.now().getTime() < expires;
  }

  private needsReserve(subject: string): boolean {
    return this.scripted.needsReserve.includes(key(subject)) && !this.hasGrant(subject);
  }
}

function respond(reply: FakeReply, token: CancellationSignal): MeteredResponse {
  type Result = Awaited<MeteredResponse["result"]>;
  let settleText!: (text: string) => void;
  let settleResult!: (result: Result) => void;
  const text = new Promise<string>((resolve) => (settleText = resolve));
  const result = new Promise<Result>((resolve) => (settleResult = resolve));
  const cost = reply.cost ?? 0;
  const borrowed = reply.borrowed ?? 0;

  async function* stream(): AsyncGenerator<string> {
    let streamed = "";
    let stopped: Result["stopped"] = reply.stop ?? false;
    for (const chunk of reply.chunks ?? []) {
      if (token.isCancellationRequested) break;
      streamed += chunk;
      yield chunk;
    }
    if (token.isCancellationRequested) stopped = "cancelled";
    settleText(streamed);
    settleResult({ cost, stopped, borrowed });
  }

  return { stream: stream(), text, result };
}

function emptyCalls(): FakeQ0T4Calls {
  return { extensionIds: [], sendRequest: [], canSpend: [], allowReserve: [] };
}
