import { describe, expect, it } from "vitest";
import { Emitter } from "./emitter";

describe("Emitter", () => {
  it("fire calls every listener with the value, in subscription order", () => {
    const emitter = new Emitter<number>();
    const seen: string[] = [];
    emitter.event((n) => seen.push(`a${n}`));
    emitter.event((n) => seen.push(`b${n}`));
    emitter.fire(1);
    expect(seen).toEqual(["a1", "b1"]);
  });

  it("a disposed listener is not called", () => {
    const emitter = new Emitter<void>();
    let calls = 0;
    const subscription = emitter.event(() => calls++);
    subscription.dispose();
    emitter.fire();
    expect(calls).toBe(0);
  });

  it("listenerCount reports live listeners", () => {
    const emitter = new Emitter<void>();
    const subscription = emitter.event(() => {});
    emitter.event(() => {});
    subscription.dispose();
    expect(emitter.listenerCount).toBe(1);
  });
});
