import { describe, expect, it } from "vitest";
import { isSendError } from "../../src/core/budget/sendError";
import type { Availability, BudgetSnapshot, UsageChange } from "../../src/core/types";
import { collect, messages, model, send } from "../contract/budgetPortContract";
import { FakeBudget } from "./fakeBudget";
import { FakeCancellation } from "./fakeCancellation";
import { FixedClock } from "./fixedClock";

const subject = "RemonStuff/Q0T4";

function setup() {
  const clock = new FixedClock("2026-10-14T09:00:00.000Z", "Europe/Amsterdam");
  return { clock, budget: new FakeBudget({ clock }) };
}

/** Lets pending promise callbacks run. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("FakeBudget: send", () => {
  it("send streams the scripted chunks in order", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["one", "two", "three"] });
    expect(await collect(await send(budget, subject))).toEqual(["one", "two", "three"]);
  });

  it("send resolves outcome complete with the scripted cost, unit and borrowed", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["x"], cost: 42, unit: "credits", borrowed: 7 });
    const reply = await send(budget, subject);
    await collect(reply);
    expect(await reply.outcome).toEqual({
      status: "complete",
      usage: { cost: 42, unit: "credits", borrowed: 7 },
    });
  });

  it("an unscripted send completes with no chunks and zero cost in tokens", async () => {
    const { budget } = setup();
    const reply = await send(budget, subject);
    expect(await collect(reply)).toEqual([]);
    expect(await reply.outcome).toEqual({
      status: "complete",
      usage: { cost: 0, unit: "tokens", borrowed: 0 },
    });
  });

  it("send stops yielding and resolves stopped-by-user when the signal is cancelled", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["a", "b", "c"], cost: 3 });
    const cancel = new FakeCancellation();
    const reply = await send(budget, subject, cancel);
    const iterator = reply.chunks[Symbol.asyncIterator]();
    expect(await iterator.next()).toEqual({ value: "a", done: false });
    cancel.cancel();
    expect((await iterator.next()).done).toBe(true);
    expect(await reply.outcome).toMatchObject({ status: "stopped-by-user", usage: { cost: 3 } });
  });

  it("a signal cancelled before sending yields nothing", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["a"] });
    const cancel = new FakeCancellation();
    cancel.cancel();
    const reply = await send(budget, subject, cancel);
    expect(await collect(reply)).toEqual([]);
    expect((await reply.outcome).status).toBe("stopped-by-user");
  });

  it("send ends early with outcome stopped-by-budget when scripted", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["first", "second"], cost: 150, stop: "budget" });
    const reply = await send(budget, subject);
    expect(await collect(reply)).toEqual(["first", "second"]);
    expect(await reply.outcome).toMatchObject({
      status: "stopped-by-budget",
      usage: { cost: 150 },
    });
  });

  it.each(["over-budget", "blocked", "no-prices", "needs-reserve-approval", "unknown"] as const)(
    "send rejects with a scripted %s refusal before the first chunk",
    async (code) => {
      const { budget } = setup();
      budget.scriptReply({ reject: { kind: "refused", code, message: "No." } });
      const error = await send(budget, subject).catch((e: unknown) => e);
      expect(isSendError(error) && error.failure).toEqual({
        kind: "refused",
        code,
        message: "No.",
      });
    },
  );

  it("send rejects with a scripted model error", async () => {
    const { budget } = setup();
    budget.scriptReply({ reject: { kind: "model", code: "no-permissions", message: "Consent." } });
    const error = await send(budget, subject).catch((e: unknown) => e);
    expect(isSendError(error) && error.failure.kind).toBe("model");
  });

  it("an error after chunk n ends the stream and resolves outcome failed, keeping the cost", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["a", "b", "c"], cost: 5, failAfter: 2, failMessage: "Boom" });
    const reply = await send(budget, subject);
    expect(await collect(reply)).toEqual(["a", "b"]);
    expect(await reply.outcome).toEqual({
      status: "failed",
      message: "Boom",
      usage: { cost: 5, unit: "tokens", borrowed: 0 },
    });
  });

  it("chunk delays use the injected FixedClock, not real timers", async () => {
    const { budget, clock } = setup();
    budget.scriptReply({ chunks: ["a", "b"], delayMs: 100 });
    const reply = await send(budget, subject);
    const iterator = reply.chunks[Symbol.asyncIterator]();

    const first = iterator.next();
    let settled = false;
    void first.then(() => (settled = true));
    await flush();
    expect(settled).toBe(false);

    clock.advance(100);
    expect(await first).toEqual({ value: "a", done: false });
    const second = iterator.next();
    clock.advance(100);
    expect(await second).toEqual({ value: "b", done: false });
  });

  it("cancelling during a chunk delay ends the stream without waiting for the clock", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["a"], delayMs: 1_000 });
    const cancel = new FakeCancellation();
    const reply = await send(budget, subject, cancel);
    const next = reply.chunks[Symbol.asyncIterator]().next();
    cancel.cancel();
    expect((await next).done).toBe(true);
    expect((await reply.outcome).status).toBe("stopped-by-user");
  });

  it("scripted replies are used in order", async () => {
    const { budget } = setup();
    budget.scriptReply({ chunks: ["first"] });
    budget.scriptReply({ chunks: ["second"] });
    expect(await collect(await send(budget, subject))).toEqual(["first"]);
    expect(await collect(await send(budget, subject))).toEqual(["second"]);
  });
});

describe("FakeBudget: check and the reserve", () => {
  it("check returns the scripted decisions in order, then allowed", async () => {
    const { budget } = setup();
    budget.scriptCheck({ kind: "allowed", remaining: 50, wouldBorrow: true, unit: "credits" });
    budget.scriptCheck({ kind: "refused", code: "over-budget", message: "Spent." });

    expect(await budget.check(subject, { inputTokens: 1 })).toEqual({
      kind: "allowed",
      remaining: 50,
      wouldBorrow: true,
      unit: "credits",
    });
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({
      kind: "refused",
      code: "over-budget",
    });
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({
      kind: "allowed",
      wouldBorrow: false,
    });
  });

  it("in ask mode, check and send refuse with needs-reserve-approval until allowReserve(subject)", async () => {
    const { budget } = setup();
    budget.requireReserveApproval(subject);

    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({
      kind: "refused",
      code: "needs-reserve-approval",
    });
    const error = await send(budget, subject).catch((e: unknown) => e);
    expect(isSendError(error) && error.failure.code).toBe("needs-reserve-approval");

    expect(await budget.allowReserve(subject)).toBe(true);
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({
      kind: "allowed",
      wouldBorrow: true,
    });
    await expect(send(budget, subject)).resolves.toBeDefined();
  });

  it("subjects are matched case-insensitively, like Q0T4", async () => {
    const { budget } = setup();
    budget.requireReserveApproval("remonstuff/q0t4");
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({ kind: "refused" });
    await budget.allowReserve("REMONSTUFF/Q0T4");
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({ kind: "allowed" });
  });

  it("a reserve grant applies to that subject only", async () => {
    const { budget } = setup();
    budget.requireReserveApproval(subject);
    budget.requireReserveApproval("RemonStuff/R3P0");
    await budget.allowReserve(subject);
    expect(await budget.check("RemonStuff/R3P0", { inputTokens: 1 })).toMatchObject({
      kind: "refused",
      code: "needs-reserve-approval",
    });
  });

  it("a reserve grant expires when FixedClock passes the week's reset", async () => {
    const { budget, clock } = setup();
    budget.setWeekEnd("2026-10-19T00:00:00.000Z");
    budget.requireReserveApproval(subject);
    await budget.allowReserve(subject);
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({ kind: "allowed" });

    clock.set("2026-10-19T00:00:00.000Z");
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({
      kind: "refused",
      code: "needs-reserve-approval",
    });
  });

  it("allowReserve resolves false and grants nothing when the Q0T4 command is missing", async () => {
    const { budget } = setup();
    budget.requireReserveApproval(subject);
    budget.setReserveCommandAvailable(false);
    expect(await budget.allowReserve(subject)).toBe(false);
    expect(await budget.check(subject, { inputTokens: 1 })).toMatchObject({ kind: "refused" });
  });
});

describe("FakeBudget: status, events and availability", () => {
  const snapshot: BudgetSnapshot = {
    unit: "tokens",
    subjects: [
      {
        subject,
        weeklyBudget: 150_000,
        weeklyUsed: 112_000,
        resetsAt: "2026-10-19T00:00:00+02:00",
        isDefault: false,
      },
    ],
  };

  it("status returns undefined until a snapshot is scripted, then a copy of it", async () => {
    const { budget } = setup();
    expect(await budget.status()).toBeUndefined();
    budget.setStatus(snapshot);
    const status = await budget.status();
    expect(status).toEqual(snapshot);
    expect(status).not.toBe(snapshot);
  });

  it("emitUsageChanged notifies onDidChangeUsage listeners with { subject, source, cost }", () => {
    const { budget } = setup();
    const seen: UsageChange[] = [];
    const subscription = budget.onDidChangeUsage((change) => seen.push(change));
    const change = { subject, source: "api:RemonStuff.r3p0", cost: 12 };
    budget.emitUsageChanged(change);
    subscription.dispose();
    budget.emitUsageChanged(change);
    expect(seen).toEqual([change]);
  });

  it("is ready with no degradations by default", () => {
    expect(setup().budget.availability()).toEqual({ state: "ready", degraded: [] });
  });

  it("setAvailability notifies onDidChangeAvailability and availability() returns the new state", () => {
    const { budget } = setup();
    const seen: Availability[] = [];
    budget.onDidChangeAvailability((a) => seen.push(a));
    budget.setAvailability({ state: "version-mismatch", found: 2 });
    expect(budget.availability()).toEqual({ state: "version-mismatch", found: 2 });
    expect(seen).toEqual([{ state: "version-mismatch", found: 2 }]);
  });
});

describe("FakeBudget: recording", () => {
  it("records every check, send and allowReserve call", async () => {
    const { budget } = setup();
    await budget.check(subject, { inputTokens: 12, model: "GPT-5 mini" });
    await collect(await send(budget, subject));
    await budget.allowReserve(subject);

    expect(budget.calls.check).toEqual([
      { subject, estimate: { inputTokens: 12, model: "GPT-5 mini" } },
    ]);
    expect(budget.calls.send).toEqual([{ subject, model, messages }]);
    expect(budget.calls.allowReserve).toEqual([subject]);
  });
});
