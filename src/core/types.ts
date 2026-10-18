// Domain types shared by core, ports and the webview. Plain data only: no
// vscode types, nothing that can't survive JSON (docs/PLAN.md §5).

// ── Repos and tabs ──────────────────────────────────────────────────────────

/** A normalised workspace folder URI, e.g. "file:///d%3A/Repos/Q0T4". Tabs are keyed by it. */
export type TabKey = string;

export interface RepoRemote {
  readonly name: string;
  readonly url: string;
}

/** One workspace folder, as RepoDiscoveryPort reports it. */
export interface RepoInfo {
  readonly key: TabKey;
  readonly folderName: string;
  readonly folderUri: string;
  /** Remotes of the git repository whose root contains the folder; empty when none. */
  readonly remotes: readonly RepoRemote[];
}

export type IdentitySource = "origin" | "remote" | "folder";

export interface RepoTab {
  readonly key: TabKey;
  /** Exactly what goes to Q0T4, e.g. "RemonStuff/Q0T4" or a folder name. */
  readonly subject: string;
  readonly identitySource: IdentitySource;
  /** The repo name, disambiguated with the folder name when two tabs clash. */
  readonly label: string;
  readonly tooltip: string;
  readonly folderUri: string;
  /** Workspace folder index. */
  readonly order: number;
}

// ── Models and messages ─────────────────────────────────────────────────────

/** How core refers to a model; the adapter re-selects the real object at send time. */
export interface ModelRef {
  readonly vendor: string;
  readonly id: string;
}

export interface ModelInfo extends ModelRef {
  /** Display name shown in the picker, e.g. "GPT-5 mini". */
  readonly name: string;
  readonly family: string;
  readonly maxInputTokens: number;
}

/** A message as core builds it; the adapter converts it to a vscode message. */
export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

// ── Conversations ───────────────────────────────────────────────────────────

export type BudgetUnit = "tokens" | "credits";

export interface Usage {
  readonly cost: number;
  readonly unit: BudgetUnit;
  /** The part of `cost` borrowed from Q0T4's reserve. */
  readonly borrowed: number;
}

export type TurnStatus =
  "complete" | "stopped-by-user" | "stopped-by-budget" | "failed" | "interrupted";

export interface AttachmentRef {
  /** Repo-relative path; content is never stored. */
  readonly path: string;
  readonly bytes: number;
}

export interface UserTurn {
  readonly id: string;
  readonly role: "user";
  readonly text: string;
  readonly attachments: readonly AttachmentRef[];
  /** ISO timestamp. */
  readonly at: string;
}

export interface AssistantTurn {
  readonly id: string;
  readonly role: "assistant";
  readonly text: string;
  readonly status: TurnStatus;
  readonly model: ModelRef & { readonly name: string };
  readonly usage?: Usage;
  readonly error?: string;
  readonly at: string;
}

export type Turn = UserTurn | AssistantTurn;

export interface Conversation {
  readonly v: 1;
  readonly conversationId: string;
  readonly subject: string;
  readonly createdAt: string;
  readonly turns: readonly Turn[];
}

// ── Budget (what core needs from Q0T4, in R3P0's own terms) ─────────────────

/** Q0T4's refusal codes (Q0T4 #64), plus "unknown" for anything newer. */
export type RefusalCode =
  "over-budget" | "blocked" | "no-prices" | "needs-reserve-approval" | "unknown";

/** Whatever refusal details Q0T4 provides (Q0T4-REQUESTS R2); all optional. */
export interface RefusalDetails {
  readonly used?: number;
  readonly budget?: number;
  readonly resetsAt?: string;
  readonly unit?: BudgetUnit;
}

export type SpendDecision =
  | {
      readonly kind: "allowed";
      readonly remaining: number;
      readonly wouldBorrow: boolean;
      readonly unit: BudgetUnit;
    }
  | {
      readonly kind: "refused";
      readonly code: RefusalCode;
      readonly message: string;
      readonly details?: RefusalDetails;
    };

/** Model errors that pass through Q0T4 unchanged (vscode.LanguageModelError codes). */
export type ModelErrorCode = "not-found" | "no-permissions" | "blocked" | "unknown";

/** Why `BudgetPort.send` rejected before the first chunk. */
export type SendFailure =
  | {
      readonly kind: "refused";
      readonly code: RefusalCode;
      readonly message: string;
      readonly details?: RefusalDetails;
    }
  | { readonly kind: "model"; readonly code: ModelErrorCode; readonly message: string };

export type ReplyOutcome =
  | {
      readonly status: "complete" | "stopped-by-user" | "stopped-by-budget";
      readonly usage: Usage;
    }
  | { readonly status: "failed"; readonly message: string; readonly usage?: Usage };

export interface Reply {
  readonly chunks: AsyncIterable<string>;
  /** Settles after `chunks` ends; never rejects. */
  readonly outcome: Promise<ReplyOutcome>;
}

export interface SubjectBudget {
  readonly subject: string;
  readonly weeklyBudget: number;
  readonly weeklyUsed: number;
  readonly resetsAt: string;
  readonly monthlyShare?: number;
  readonly cycleUsed?: number;
  /** Monthly pace as Q0T4 reports it (1 = on track). */
  readonly pace?: number;
  readonly isDefault: boolean;
  /** Q0T4's own verdict, when its snapshot provides one (Q0T4-REQUESTS R1). */
  readonly state?: "ok" | "warning" | "exhausted";
}

export interface BudgetSnapshot {
  readonly unit: BudgetUnit;
  readonly cycle?: { readonly start: string; readonly end: string };
  readonly reserve?: {
    readonly size: number;
    readonly borrowed: number;
    readonly remaining: number;
  };
  readonly prices?: {
    readonly fetchedAt: string;
    readonly source: string;
    readonly stale: boolean;
  };
  readonly subjects: readonly SubjectBudget[];
}

export interface UsageChange {
  readonly subject: string;
  readonly source: string;
  readonly cost: number;
}

/** The parts of Q0T4's client R3P0 can do without (Q0T4-API-CONTRACT §3). */
export type DegradableMember = "getStatus" | "canSpend" | "onDidChangeUsage";

export type Availability =
  | { readonly state: "ready"; readonly degraded: readonly DegradableMember[] }
  | { readonly state: "missing" }
  | { readonly state: "activation-failed"; readonly error: string }
  | { readonly state: "version-mismatch"; readonly found: unknown }
  | { readonly state: "incompatible"; readonly missing: readonly string[] };
