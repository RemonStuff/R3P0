import { describe, expect, it } from "vitest";
import { FixedClock } from "./fixedClock";

describe("FixedClock", () => {
  it("now returns the configured instant", () => {
    const clock = new FixedClock("2026-10-14T09:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-14T09:00:00.000Z");
  });

  it("now returns a copy, so callers can't move the clock", () => {
    const clock = new FixedClock("2026-10-14T09:00:00.000Z");
    clock.now().setFullYear(2000);
    expect(clock.now().toISOString()).toBe("2026-10-14T09:00:00.000Z");
  });

  it("timeZone returns the configured IANA zone", () => {
    expect(new FixedClock("2026-10-14T09:00:00Z", "Europe/Amsterdam").timeZone()).toBe(
      "Europe/Amsterdam",
    );
    expect(new FixedClock("2026-10-14T09:00:00Z").timeZone()).toBe("UTC");
  });

  it("advance moves time forward and runs due timers in order", () => {
    const clock = new FixedClock("2026-10-14T09:00:00.000Z");
    const ran: string[] = [];
    clock.setTimeout(() => ran.push("b@20"), 20);
    clock.setTimeout(() => ran.push("a@10"), 10);
    clock.setTimeout(() => ran.push("c@30"), 30);

    clock.advance(25);

    expect(ran).toEqual(["a@10", "b@20"]);
    expect(clock.now().toISOString()).toBe("2026-10-14T09:00:00.025Z");
  });

  it("timers due at the same time run in the order they were set", () => {
    const clock = new FixedClock("2026-10-14T09:00:00Z");
    const ran: number[] = [];
    clock.setTimeout(() => ran.push(1), 10);
    clock.setTimeout(() => ran.push(2), 10);
    clock.advance(10);
    expect(ran).toEqual([1, 2]);
  });

  it("a timer set by a timer runs within the same advance when it falls due", () => {
    const clock = new FixedClock("2026-10-14T09:00:00Z");
    const ran: string[] = [];
    clock.setTimeout(() => {
      ran.push("first");
      clock.setTimeout(() => ran.push("second"), 5);
    }, 10);
    clock.advance(20);
    expect(ran).toEqual(["first", "second"]);
  });

  it("a timer sees the time it was due at", () => {
    const clock = new FixedClock("2026-10-14T09:00:00.000Z");
    let seen = "";
    clock.setTimeout(() => (seen = clock.now().toISOString()), 10);
    clock.advance(50);
    expect(seen).toBe("2026-10-14T09:00:00.010Z");
  });

  it("a disposed timer never runs", () => {
    const clock = new FixedClock("2026-10-14T09:00:00Z");
    let ran = false;
    clock.setTimeout(() => (ran = true), 10).dispose();
    clock.advance(20);
    expect(ran).toBe(false);
  });

  it("set jumps to an ISO instant and runs timers that fall due", () => {
    const clock = new FixedClock("2026-10-14T09:00:00.000Z");
    let ran = false;
    clock.setTimeout(() => (ran = true), 60_000);
    clock.set("2026-10-14T10:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-14T10:00:00.000Z");
    expect(ran).toBe(true);
  });

  it("refuses to go backwards", () => {
    const clock = new FixedClock("2026-10-14T09:00:00Z");
    expect(() => clock.advance(-1)).toThrow(/backwards/);
    expect(() => clock.set("2026-10-13T09:00:00Z")).toThrow(/backwards/);
  });

  it("pendingTimers counts timers that haven't run or been disposed", () => {
    const clock = new FixedClock("2026-10-14T09:00:00Z");
    clock.setTimeout(() => {}, 10);
    clock.setTimeout(() => {}, 20).dispose();
    expect(clock.pendingTimers).toBe(1);
  });
});
