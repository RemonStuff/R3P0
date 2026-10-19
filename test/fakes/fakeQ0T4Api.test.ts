import { describe, expect, it } from "vitest";
import type { MeteredResponse, Q0T4BudgetError, UsageChange } from "../../src/ports/q0t4Api";
import { FakeCancellation } from "./fakeCancellation";
import { FakeQ0T4Api, type PlainQ0T4Types } from "./fakeQ0T4Api";
import { FixedClock } from "./fixedClock";

const subject = "RemonStuff/Q0T4";
const model = { vendor: "r3p0-test", id: "fake-model" };

function setup(options: ConstructorParameters<typeof FakeQ0T4Api<PlainQ0T4Types>>[0] = {}) {
  const clock = new FixedClock("2026-10-14T09:00:00.000Z");
  const fake = new FakeQ0T4Api<PlainQ0T4Types>({ now: () => clock.now(), ...options });
  return { clock, fake, client: fake.api.forExtension("RemonStuff.r3p0") };
}

async function collect(response: MeteredResponse): Promise<string[]> {
  const parts: string[] = [];
  for await (const part of response.stream) parts.push(part);
  return parts;
}

function send(client: ReturnType<typeof setup>["client"], token = new FakeCancellation()) {
  return client.sendRequest(subject, model, ["Hello"], undefined, token);
}

describe("FakeQ0T4Api: shape", () => {
  it("apiVersion defaults to 1 and can be overridden", () => {
    expect(setup().fake.api.apiVersion).toBe(1);
    expect((setup({ apiVersion: 2 }).fake.exports as { apiVersion: unknown }).apiVersion).toBe(2);
  });

  it("forExtension returns a client and records the extension id", () => {
    const { fake, client } = setup();
    expect(typeof client.sendRequest).toBe("function");
    expect(fake.calls().extensionIds).toEqual(["RemonStuff.r3p0"]);
  });

  it("members can be removed to simulate an incomplete API (forExtension, or any client member)", () => {
    const noForExtension = setup({ omit: ["forExtension"] }).fake.exports as object;
    expect("forExtension" in noForExtension).toBe(false);

    const { fake } = setup({ omit: ["getStatus", "canSpend", "onDidChangeUsage"] });
    const client = (fake.exports as { forExtension(id: string): object }).forExtension("x");
    expect(Object.keys(client).sort()).toEqual(["sendRequest"]);
  });

  it("exports is undefined when the fake simulates a Q0T4 without an API", () => {
    expect(setup({ noApi: true }).fake.exports).toBeUndefined();
  });
});

describe("FakeQ0T4Api: sendRequest", () => {
  it("sendRequest streams scripted text through stream, resolves text and result { cost, stopped, borrowed }", async () => {
    const { fake, client } = setup();
    fake.script({ replies: [{ chunks: ["Hel", "lo"], cost: 12, borrowed: 2 }] });
    const response = await send(client);
    expect(await collect(response)).toEqual(["Hel", "lo"]);
    expect(await response.text).toBe("Hello");
    expect(await response.result).toEqual({ cost: 12, stopped: false, borrowed: 2 });
  });

  it("sendRequest records the subject, the model's vendor/id and the message texts", async () => {
    const { fake, client } = setup();
    await collect(await send(client));
    expect(fake.calls().sendRequest).toEqual([{ subject, model, messages: ["Hello"] }]);
  });

  it("sendRequest rejects with a Q0T4BudgetError of the scripted code before streaming", async () => {
    const { fake, client } = setup();
    fake.script({
      replies: [{ reject: { code: "over-budget", used: 150, budget: 150, unit: "tokens" } }],
    });
    const error = (await send(client).catch((e: unknown) => e)) as Q0T4BudgetError;
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("over-budget");
    expect(error).toMatchObject({ used: 150, budget: 150, unit: "tokens" });
  });

  it("in ask mode, sendRequest rejects with needs-reserve-approval until allowReserve(subject) for this week", async () => {
    const { fake, client, clock } = setup();
    fake.script({ needsReserve: [subject], weekEndsAt: "2026-10-19T00:00:00.000Z" });

    const refused = (await send(client).catch((e: unknown) => e)) as Q0T4BudgetError;
    expect(refused.code).toBe("needs-reserve-approval");

    fake.allowReserve("remonstuff/q0t4");
    await expect(send(client)).resolves.toBeDefined();

    clock.set("2026-10-19T00:00:00.000Z");
    const nextWeek = (await send(client).catch((e: unknown) => e)) as Q0T4BudgetError;
    expect(nextWeek.code).toBe("needs-reserve-approval");
    expect(fake.calls().allowReserve).toEqual(["remonstuff/q0t4"]);
  });

  it('sendRequest ends the stream early with result.stopped = "budget" when scripted', async () => {
    const { fake, client } = setup();
    fake.script({ replies: [{ chunks: ["partial"], cost: 150, stop: "budget" }] });
    const response = await send(client);
    expect(await collect(response)).toEqual(["partial"]);
    expect(await response.result).toMatchObject({ stopped: "budget", cost: 150 });
  });

  it("sendRequest honours the cancellation token", async () => {
    const { fake, client } = setup();
    fake.script({ replies: [{ chunks: ["a", "b", "c"] }] });
    const token = new FakeCancellation();
    const response = await send(client, token);
    const seen: string[] = [];
    for await (const part of response.stream) {
      seen.push(part);
      token.cancel();
    }
    expect(seen).toEqual(["a"]);
    expect(await response.result).toMatchObject({ stopped: "cancelled" });
    expect(await response.text).toBe("a");
  });
});

describe("FakeQ0T4Api: status, spend and events", () => {
  it("canSpend returns the scripted SpendCheck, then allowed", async () => {
    const { fake, client } = setup();
    fake.script({
      spend: [{ allowed: false, remaining: 0, wouldBorrow: false, unit: "credits", reason: "x" }],
    });
    expect(await client.canSpend(subject, { inputTokens: 10 })).toMatchObject({ allowed: false });
    expect(await client.canSpend(subject, { inputTokens: 10 })).toMatchObject({ allowed: true });
    expect(fake.calls().canSpend).toEqual([
      { subject, estimate: { inputTokens: 10 } },
      { subject, estimate: { inputTokens: 10 } },
    ]);
  });

  it("canSpend reports needs-reserve-approval for a subject that needs the reserve", async () => {
    const { fake, client } = setup();
    fake.script({ needsReserve: [subject] });
    expect(await client.canSpend(subject, { inputTokens: 10 })).toMatchObject({
      allowed: false,
      reason: "needs-reserve-approval",
    });
  });

  it("getStatus returns the scripted StatusSnapshot", async () => {
    const { fake, client } = setup();
    const status = {
      unit: "tokens" as const,
      subjects: [
        { subject, weeklyBudget: 150, weeklyUsed: 112, resetsAt: "2026-10-19", isDefault: true },
      ],
    };
    fake.script({ status });
    expect(await client.getStatus()).toEqual(status);
  });

  it("onDidChangeUsage fires { subject, source, cost } when emit is called", () => {
    const { fake, client } = setup();
    const seen: UsageChange[] = [];
    const subscription = client.onDidChangeUsage((change) => seen.push(change));
    fake.emitUsage({ subject, source: "q0t4", cost: 5 });
    subscription.dispose();
    fake.emitUsage({ subject, source: "q0t4", cost: 6 });
    expect(seen).toEqual([{ subject, source: "q0t4", cost: 5 }]);
  });

  it("reset clears scripts, calls and grants", async () => {
    const { fake, client } = setup();
    fake.script({ replies: [{ chunks: ["x"] }], needsReserve: [subject] });
    fake.allowReserve(subject);
    fake.reset();
    expect(fake.calls()).toEqual({
      extensionIds: [],
      sendRequest: [],
      canSpend: [],
      allowReserve: [],
    });
    expect(await collect(await send(client))).toEqual([]);
  });
});
