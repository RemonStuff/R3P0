import { describe, expect, it } from "vitest";
import { FakeCancellation } from "./fakeCancellation";

describe("FakeCancellation", () => {
  it("starts uncancelled", () => {
    expect(new FakeCancellation().isCancellationRequested).toBe(false);
  });

  it("cancel notifies listeners exactly once", () => {
    const cancel = new FakeCancellation();
    let calls = 0;
    cancel.onCancellationRequested(() => calls++);
    cancel.cancel();
    cancel.cancel();
    expect(cancel.isCancellationRequested).toBe(true);
    expect(calls).toBe(1);
  });

  it("a disposed listener is not notified", () => {
    const cancel = new FakeCancellation();
    let called = false;
    cancel.onCancellationRequested(() => (called = true)).dispose();
    cancel.cancel();
    expect(called).toBe(false);
  });
});
