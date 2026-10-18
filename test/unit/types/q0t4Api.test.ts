// Type-level: checked by `npm run typecheck`. The `vscode` imports are type-only,
// so they're erased at runtime and never reach the throwing test alias.
import type {
  CancellationToken,
  Event,
  LanguageModelChat,
  LanguageModelChatMessage,
  LanguageModelChatRequestOptions,
} from "vscode";
import { describe, expectTypeOf, it } from "vitest";
import type { VscodeQ0T4Api, VscodeQ0T4Client } from "../../../src/adapters/q0t4Types";
import type { CancellationSignal } from "../../../src/ports/CancellationSignal";
import type {
  MeteredResponse,
  Q0T4Api,
  Q0T4BudgetError,
  Q0T4Client,
  Q0T4Event,
  Q0T4Types,
  SpendCheck,
  StatusSnapshot,
  UsageChange,
} from "../../../src/ports/q0t4Api";

type Plain = { Model: { id: string }; Message: string; Options: never; Token: CancellationSignal };

describe("Q0T4 contract (Q0T4 PLAN §9.8)", () => {
  it("Q0T4Api.apiVersion is the literal 1 and forExtension returns a Q0T4Client", () => {
    expectTypeOf<Q0T4Api<Plain>["apiVersion"]>().toEqualTypeOf<1>();
    expectTypeOf<Q0T4Api<Plain>["forExtension"]>().toEqualTypeOf<
      (extensionId: string) => Q0T4Client<Plain>
    >();
  });

  it("Q0T4Client.sendRequest takes the model and message types from the type bundle", () => {
    type Send = Q0T4Client<Plain>["sendRequest"];
    expectTypeOf<Parameters<Send>>().toEqualTypeOf<
      [
        subject: string,
        model: { id: string },
        messages: string[],
        options: undefined,
        token: CancellationSignal,
      ]
    >();
    expectTypeOf<ReturnType<Send>>().toEqualTypeOf<Promise<MeteredResponse>>();
  });

  it("canSpend, getStatus and onDidChangeUsage have the §9.8 shapes", () => {
    expectTypeOf<Q0T4Client<Plain>["canSpend"]>().toEqualTypeOf<
      (subject: string, estimate: { inputTokens: number; model?: string }) => Promise<SpendCheck>
    >();
    expectTypeOf<Q0T4Client<Plain>["getStatus"]>().toEqualTypeOf<() => Promise<StatusSnapshot>>();
    expectTypeOf<Q0T4Client<Plain>["onDidChangeUsage"]>().toEqualTypeOf<Q0T4Event<UsageChange>>();
  });

  it("Q0T4BudgetError.code is the union of the four Q0T4 codes", () => {
    expectTypeOf<Q0T4BudgetError["code"]>().toEqualTypeOf<
      "over-budget" | "blocked" | "no-prices" | "needs-reserve-approval"
    >();
  });

  it("MeteredResponse has stream, text and result", () => {
    expectTypeOf<MeteredResponse["stream"]>().toEqualTypeOf<AsyncIterable<string>>();
    expectTypeOf<MeteredResponse["result"]>().resolves.toHaveProperty("borrowed");
  });

  it("the type bundle constrains nothing beyond its four slots", () => {
    expectTypeOf<Plain>().toExtend<Q0T4Types>();
  });
});

describe("vscode instantiation (src/adapters/q0t4Types)", () => {
  it("sendRequest accepts vscode.LanguageModelChat, LanguageModelChatMessage[], options | undefined and CancellationToken", () => {
    expectTypeOf<Parameters<VscodeQ0T4Client["sendRequest"]>>().toEqualTypeOf<
      [
        subject: string,
        model: LanguageModelChat,
        messages: LanguageModelChatMessage[],
        options: LanguageModelChatRequestOptions | undefined,
        token: CancellationToken,
      ]
    >();
    expectTypeOf<ReturnType<VscodeQ0T4Api["forExtension"]>>().toEqualTypeOf<VscodeQ0T4Client>();
  });

  it("a vscode.Event<UsageChange> is assignable to Q0T4Event<UsageChange>", () => {
    expectTypeOf<Event<UsageChange>>().toExtend<Q0T4Event<UsageChange>>();
  });

  it("a vscode CancellationToken is assignable to CancellationSignal", () => {
    expectTypeOf<CancellationToken>().toExtend<CancellationSignal>();
  });
});
