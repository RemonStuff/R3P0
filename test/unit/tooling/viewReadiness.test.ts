import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openViewWhenReady } from "../../integration/viewReadiness";

function observe<Value>(promise: Promise<Value>) {
  let result: PromiseSettledResult<Value> | undefined;
  const done = promise.then(
    (value) => {
      result = { status: "fulfilled", value };
    },
    (reason: unknown) => {
      result = { status: "rejected", reason };
    },
  );
  return {
    done,
    get result() {
      return result;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T14:00:00.000Z"));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("view readiness", () => {
  it("focuses once before reading an already-ready view, without scheduling a timer", async () => {
    const view = { id: "r3p0.chat" };
    const events: string[] = [];
    const focus = vi.fn(async () => {
      events.push("focus");
    });
    const read = vi.fn(() => {
      events.push("read");
      return view;
    });
    await expect(openViewWhenReady(focus, read)).resolves.toBe(view);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["focus", "read"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits when focus resolves before activation and provider resolution", async () => {
    let active = false;
    const view = { id: "r3p0.chat" };
    let resolved: typeof view | undefined;
    const focus = vi.fn(async () => {});
    setTimeout(() => (active = true), 40);
    setTimeout(() => (resolved = view), 100);
    const pending = observe(openViewWhenReady(focus, () => (active ? resolved : undefined)));
    await vi.advanceTimersByTimeAsync(0);
    expect(pending.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(40);
    expect(active).toBe(true);
    expect(pending.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(59);
    expect(pending.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await pending.done;
    expect(pending.result).toEqual({ status: "fulfilled", value: view });
    expect(focus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not accept a view until its extension is active", async () => {
    let active = false;
    const view = { id: "r3p0.chat" };
    setTimeout(() => (active = true), 40);
    const pending = observe(
      openViewWhenReady(
        async () => {},
        () => (active ? view : undefined),
      ),
    );
    await vi.advanceTimersByTimeAsync(39);
    expect(pending.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await pending.done;
    expect(pending.result).toEqual({ status: "fulfilled", value: view });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not inspect readiness before the focus command resolves", async () => {
    const view = { id: "r3p0.chat" };
    const read = vi.fn(() => view);
    let release!: () => void;
    const focused = new Promise<void>((resolve) => (release = resolve));
    const pending = openViewWhenReady(() => focused, read);
    await vi.advanceTimersByTimeAsync(100);
    expect(read).not.toHaveBeenCalled();
    release();
    await expect(pending).resolves.toBe(view);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("fails explicitly at 5000 ms, not 4999 ms, when readiness never arrives", async () => {
    const focus = vi.fn(async () => {});
    const pending = observe(openViewWhenReady(focus, () => undefined));
    await vi.advanceTimersByTimeAsync(4999);
    expect(pending.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await pending.done;
    expect(pending.result).toEqual({
      status: "rejected",
      reason: new Error(
        "Opening the view did not activate the extension and resolve its provider within 5000 ms",
      ),
    });
    expect(focus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts readiness at the deadline without leaving a timer", async () => {
    const view = { id: "r3p0.chat" };
    let resolved: typeof view | undefined;
    setTimeout(() => (resolved = view), 5000);
    const pending = observe(
      openViewWhenReady(
        async () => {},
        () => resolved,
      ),
    );
    await vi.advanceTimersByTimeAsync(5000);
    await pending.done;
    expect(pending.result).toEqual({ status: "fulfilled", value: view });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propagates focus rejection without polling or retrying the command", async () => {
    const error = new Error("Focus command failed");
    const focus = vi.fn(async () => {
      throw error;
    });
    const read = vi.fn();
    await expect(openViewWhenReady(focus, read)).rejects.toBe(error);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, 40])("propagates observer errors at %i ms without retrying them", async (delay) => {
    const error = new Error("Test API unavailable");
    const started = Date.now();
    const focus = vi.fn(async () => {});
    const pending = observe(
      openViewWhenReady(focus, () => {
        if (Date.now() - started >= delay) throw error;
        return undefined;
      }),
    );
    await vi.advanceTimersByTimeAsync(delay);
    await pending.done;
    expect(pending.result).toEqual({ status: "rejected", reason: error });
    expect(focus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps concurrent readiness waits independent", async () => {
    const first = { id: "first" };
    const second = { id: "second" };
    let a: typeof first | undefined;
    let b: typeof second | undefined;
    setTimeout(() => (a = first), 20);
    setTimeout(() => (b = second), 80);
    const focusA = vi.fn(async () => {});
    const focusB = vi.fn(async () => {});
    const pendingA = observe(openViewWhenReady(focusA, () => a));
    const pendingB = observe(openViewWhenReady(focusB, () => b));
    await vi.advanceTimersByTimeAsync(20);
    expect(pendingA.result).toEqual({ status: "fulfilled", value: first });
    expect(pendingB.result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(60);
    await Promise.all([pendingA.done, pendingB.done]);
    expect(pendingB.result).toEqual({ status: "fulfilled", value: second });
    expect(focusA).toHaveBeenCalledTimes(1);
    expect(focusB).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
