// One suite every BudgetPort implementation must pass: FakeBudget here (#04),
// and Q0T4Budget over FakeQ0T4Api later (#30), so the fake can't drift from
// the real adapter.
import { describe, expect, it } from "vitest";
import { isSendError } from "../../src/core/budget/sendError";
import type { ChatMessage, ModelRef, Reply, RefusalCode } from "../../src/core/types";
import type { BudgetPort } from "../../src/ports/BudgetPort";
import type { CancellationSignal } from "../../src/ports/CancellationSignal";
import { FakeCancellation } from "../fakes/fakeCancellation";
import type { FixedClock } from "../fakes/fixedClock";

/** How the suite scripts an implementation; each implementation provides one. */
export interface BudgetPortHarness {
  readonly port: BudgetPort;
  readonly clock: FixedClock;
  /** The next send streams these chunks and completes with this cost. */
  scriptReply(chunks: readonly string[], cost: number): void;
  /** The next send streams `chunks`, then Q0T4 cuts it off at the budget. */
  scriptBudgetStop(chunks: readonly string[], cost: number): void;
  /** The next check and send are refused with this code. */
  scriptRefusal(code: Exclude<RefusalCode, "unknown" | "needs-reserve-approval">): void;
  /** `subject` is over its weekly budget and Q0T4 asks before borrowing, until the week ends. */
  requireReserveApproval(subject: string, weekEndsAt: string): void;
}

export const model: ModelRef = { vendor: "r3p0-test", id: "fake-1" };
export const messages: readonly ChatMessage[] = [{ role: "user", content: "Hello" }];

export async function collect(reply: Reply): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of reply.chunks) chunks.push(chunk);
  return chunks;
}

export function send(port: BudgetPort, subject: string, signal?: CancellationSignal) {
  return port.send({ subject, model, messages }, signal ?? new FakeCancellation());
}

export function budgetPortContract(name: string, makeHarness: () => BudgetPortHarness) {
  describe(`BudgetPort contract: ${name}`, () => {
    it("contract: a completed send yields all text then resolves outcome", async () => {
      const h = makeHarness();
      h.scriptReply(["Hel", "lo"], 12);
      const reply = await send(h.port, "RemonStuff/Q0T4");
      expect(await collect(reply)).toEqual(["Hel", "lo"]);
      expect(await reply.outcome).toMatchObject({ status: "complete", usage: { cost: 12 } });
    });

    it("contract: cancelling the signal ends the stream and resolves stopped-by-user", async () => {
      const h = makeHarness();
      h.scriptReply(["a", "b", "c"], 3);
      const cancel = new FakeCancellation();
      const reply = await send(h.port, "RemonStuff/Q0T4", cancel);
      const seen: string[] = [];
      for await (const chunk of reply.chunks) {
        seen.push(chunk);
        cancel.cancel();
      }
      expect(seen).toEqual(["a"]);
      expect((await reply.outcome).status).toBe("stopped-by-user");
    });

    it("contract: a budget stop is not a rejection", async () => {
      const h = makeHarness();
      h.scriptBudgetStop(["partial"], 150);
      const reply = await send(h.port, "RemonStuff/Q0T4");
      expect(await collect(reply)).toEqual(["partial"]);
      expect(await reply.outcome).toMatchObject({
        status: "stopped-by-budget",
        usage: { cost: 150 },
      });
    });

    it.each(["over-budget", "blocked", "no-prices"] as const)(
      "contract: a %s refusal rejects before any chunk with its code",
      async (code) => {
        const h = makeHarness();
        h.scriptRefusal(code);
        const decision = await h.port.check("RemonStuff/Q0T4", { inputTokens: 10 });
        expect(decision).toMatchObject({ kind: "refused", code });

        h.scriptRefusal(code);
        const error = await send(h.port, "RemonStuff/Q0T4").catch((e: unknown) => e);
        expect(isSendError(error)).toBe(true);
        expect(isSendError(error) && error.failure).toMatchObject({ kind: "refused", code });
      },
    );

    it("contract: after allowReserve, needs-reserve-approval no longer refuses that subject this week", async () => {
      const h = makeHarness();
      h.requireReserveApproval("RemonStuff/Q0T4", "2026-10-19T00:00:00.000Z");

      expect(await h.port.check("RemonStuff/Q0T4", { inputTokens: 10 })).toMatchObject({
        kind: "refused",
        code: "needs-reserve-approval",
      });
      const refused = await send(h.port, "RemonStuff/Q0T4").catch((e: unknown) => e);
      expect(isSendError(refused) && refused.failure).toMatchObject({
        code: "needs-reserve-approval",
      });

      expect(await h.port.allowReserve("RemonStuff/Q0T4")).toBe(true);
      expect(await h.port.check("RemonStuff/Q0T4", { inputTokens: 10 })).toMatchObject({
        kind: "allowed",
      });
      h.scriptReply(["ok"], 1);
      expect(await collect(await send(h.port, "RemonStuff/Q0T4"))).toEqual(["ok"]);
    });
  });
}
