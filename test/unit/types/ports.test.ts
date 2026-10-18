// Type-level: checked by `npm run typecheck`. `expectTypeOf` is a no-op at runtime.
import { describe, expectTypeOf, it } from "vitest";
import type {
  Availability,
  ChatMessage,
  ModelInfo,
  ModelRef,
  RefusalCode,
  RepoInfo,
  Reply,
  ReplyOutcome,
  SpendDecision,
  Turn,
  TurnStatus,
} from "../../../src/core/types";
import type { BudgetPort } from "../../../src/ports/BudgetPort";
import type { CancellationSignal } from "../../../src/ports/CancellationSignal";
import type { ChatHistoryPort } from "../../../src/ports/ChatHistoryPort";
import type { ClockPort } from "../../../src/ports/ClockPort";
import type { Disposable } from "../../../src/ports/Disposable";
import type { ModelCatalogPort } from "../../../src/ports/ModelCatalogPort";
import type { RepoDiscoveryPort } from "../../../src/ports/RepoDiscoveryPort";
import type { WebviewChannelPort } from "../../../src/ports/WebviewChannelPort";

describe("BudgetPort", () => {
  it("send takes a ModelRef and plain ChatMessages and returns a Reply with chunks and outcome", () => {
    type Send = BudgetPort["send"];
    expectTypeOf<Parameters<Send>[0]>().toEqualTypeOf<{
      readonly subject: string;
      readonly model: ModelRef;
      readonly messages: readonly ChatMessage[];
    }>();
    expectTypeOf<Parameters<Send>[1]>().toEqualTypeOf<CancellationSignal>();
    expectTypeOf<ReturnType<Send>>().toEqualTypeOf<Promise<Reply>>();
    expectTypeOf<Reply["chunks"]>().toEqualTypeOf<AsyncIterable<string>>();
    expectTypeOf<Reply["outcome"]>().toEqualTypeOf<Promise<ReplyOutcome>>();
  });

  it("check takes estimated input tokens and the model name", () => {
    expectTypeOf<Parameters<BudgetPort["check"]>>().toEqualTypeOf<
      [subject: string, estimate: { readonly inputTokens: number; readonly model?: string }]
    >();
    expectTypeOf<ReturnType<BudgetPort["check"]>>().toEqualTypeOf<Promise<SpendDecision>>();
  });

  it("allowReserve takes a subject and resolves a boolean", () => {
    expectTypeOf<BudgetPort["allowReserve"]>().toEqualTypeOf<
      (subject: string) => Promise<boolean>
    >();
  });

  it("listeners return a Disposable", () => {
    expectTypeOf<ReturnType<BudgetPort["onDidChangeUsage"]>>().toEqualTypeOf<Disposable>();
    expectTypeOf<ReturnType<BudgetPort["onDidChangeAvailability"]>>().toEqualTypeOf<Disposable>();
  });
});

describe("domain types", () => {
  it("Availability is a discriminated union of ready | missing | activation-failed | version-mismatch | incompatible", () => {
    expectTypeOf<Availability["state"]>().toEqualTypeOf<
      "ready" | "missing" | "activation-failed" | "version-mismatch" | "incompatible"
    >();
    expectTypeOf<Extract<Availability, { state: "version-mismatch" }>>().toHaveProperty("found");
    expectTypeOf<Extract<Availability, { state: "incompatible" }>>().toHaveProperty("missing");
    expectTypeOf<Extract<Availability, { state: "activation-failed" }>>().toHaveProperty("error");
    expectTypeOf<Extract<Availability, { state: "ready" }>>().toHaveProperty("degraded");
  });

  it("SpendDecision covers allowed (with wouldBorrow) and refused with a RefusalCode", () => {
    expectTypeOf<Extract<SpendDecision, { kind: "allowed" }>>().toHaveProperty("wouldBorrow");
    expectTypeOf<
      Extract<SpendDecision, { kind: "refused" }>["code"]
    >().toEqualTypeOf<RefusalCode>();
    expectTypeOf<RefusalCode>().toEqualTypeOf<
      "over-budget" | "blocked" | "no-prices" | "needs-reserve-approval" | "unknown"
    >();
  });

  it("Turn.status covers complete | stopped-by-user | stopped-by-budget | failed | interrupted", () => {
    expectTypeOf<TurnStatus>().toEqualTypeOf<
      "complete" | "stopped-by-user" | "stopped-by-budget" | "failed" | "interrupted"
    >();
    expectTypeOf<Extract<Turn, { role: "assistant" }>["status"]>().toEqualTypeOf<TurnStatus>();
  });

  it("ChatMessage is plain JSON with role user | assistant", () => {
    expectTypeOf<ChatMessage>().toEqualTypeOf<{
      readonly role: "user" | "assistant";
      readonly content: string;
    }>();
  });
});

describe("other ports", () => {
  it("ClockPort schedules timers that can be disposed", () => {
    expectTypeOf<ReturnType<ClockPort["setTimeout"]>>().toEqualTypeOf<Disposable>();
  });

  it("ChatHistoryPort stores unknown values by key", () => {
    expectTypeOf<ReturnType<ChatHistoryPort["get"]>>().toEqualTypeOf<unknown>();
    expectTypeOf<ReturnType<ChatHistoryPort["set"]>>().toEqualTypeOf<Promise<void>>();
  });

  it("RepoDiscoveryPort and ModelCatalogPort list their items", () => {
    expectTypeOf<ReturnType<RepoDiscoveryPort["current"]>>().resolves.toEqualTypeOf<
      readonly RepoInfo[]
    >();
    expectTypeOf<ReturnType<ModelCatalogPort["list"]>>().resolves.toEqualTypeOf<
      readonly ModelInfo[]
    >();
  });

  it("WebviewChannelPort receives unknown raw messages, never trusted types", () => {
    type Listener = Parameters<WebviewChannelPort<{ type: "x" }>["onMessage"]>[0];
    expectTypeOf<Parameters<Listener>[0]>().toEqualTypeOf<unknown>();
    expectTypeOf<WebviewChannelPort<{ type: "x" }>["post"]>().parameter(0).toEqualTypeOf<{
      type: "x";
    }>();
  });
});
