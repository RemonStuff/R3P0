import { describe, expect, it } from "vitest";
import { FakeWebviewChannel } from "./fakeWebviewChannel";

describe("FakeWebviewChannel", () => {
  it("records posted messages in order and resolves true while visible", async () => {
    const channel = new FakeWebviewChannel<{ type: string }>();
    expect(await channel.post({ type: "a" })).toBe(true);
    await channel.post({ type: "b" });
    expect(channel.posted).toEqual([{ type: "a" }, { type: "b" }]);
  });

  it("post resolves false while hidden and records nothing", async () => {
    const channel = new FakeWebviewChannel<{ type: string }>();
    channel.setVisible(false);
    expect(await channel.post({ type: "lost" })).toBe(false);
    expect(channel.posted).toEqual([]);
  });

  it("receive delivers raw messages to onMessage listeners", () => {
    const channel = new FakeWebviewChannel<never>();
    const seen: unknown[] = [];
    channel.onMessage((raw) => seen.push(raw));
    channel.receive({ v: 1, type: "ready" });
    channel.receive("garbage");
    expect(seen).toEqual([{ v: 1, type: "ready" }, "garbage"]);
  });

  it("setVisible updates visible and fires onDidChangeVisibility only on change", () => {
    const channel = new FakeWebviewChannel<never>();
    const seen: boolean[] = [];
    channel.onDidChangeVisibility((v) => seen.push(v));
    channel.setVisible(false);
    channel.setVisible(false);
    channel.setVisible(true);
    expect(channel.visible).toBe(true);
    expect(seen).toEqual([false, true]);
  });

  it("takePosted returns and clears what was posted", async () => {
    const channel = new FakeWebviewChannel<number>();
    await channel.post(1);
    expect(channel.takePosted()).toEqual([1]);
    expect(channel.posted).toEqual([]);
  });
});
