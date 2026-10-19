import { describe, expect, it } from "vitest";
import { ChunkBatcher } from "../../../src/core/chat/chunkBatcher";
import { FixedClock } from "../../fakes/fixedClock";

function setup() {
  const clock = new FixedClock("2026-10-19T12:00:00.000Z");
  const batches: string[] = [];
  const batcher = new ChunkBatcher(clock, (text) => batches.push(text));
  return { clock, batches, batcher };
}

describe("ChunkBatcher", () => {
  it("flushes at 50 ms, not 49 ms", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("hello");
    expect(clock.pendingTimers).toBe(1);
    clock.advance(49);
    expect(batches).toEqual([]);
    clock.advance(1);
    expect(batches).toEqual(["hello"]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("does not debounce the first buffered text's deadline", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("a");
    clock.advance(20);
    batcher.push("b");
    clock.advance(29);
    batcher.push("c");
    expect(clock.pendingTimers).toBe(1);
    clock.advance(1);
    expect(batches).toEqual(["abc"]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("starts a new deadline after a previous batch", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("first");
    clock.advance(50);
    clock.advance(300);
    batcher.push("second");
    clock.advance(49);
    expect(batches).toEqual(["first"]);
    clock.advance(1);
    expect(batches).toEqual(["first", "second"]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("does not flush at 2047 bytes but flushes at 2048", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("a".repeat(2047));
    expect(batches).toEqual([]);
    batcher.push("b");
    expect(batches).toEqual([`${"a".repeat(2047)}b`]);
    expect(clock.pendingTimers).toBe(0);
    clock.advance(100);
    expect(batches).toHaveLength(1);
  });

  it("counts UTF-8 bytes rather than UTF-16 code units", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("\u{1f642}".repeat(511));
    expect(batches).toEqual([]);
    batcher.push("\u{1f642}");
    expect(batches).toEqual(["\u{1f642}".repeat(512)]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("measures the joined buffer when surrogate halves arrive separately", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("a".repeat(2043));
    batcher.push("\ud83d");
    batcher.push("\ude42");
    expect(batches).toEqual([]);
    batcher.push("b");
    expect(batches).toEqual([`${"a".repeat(2043)}\u{1f642}b`]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("keeps an oversized individual chunk intact", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("prefix:");
    const large = "\u4e2d".repeat(3000);
    batcher.push(large);
    expect(batches).toEqual([`prefix:${large}`]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("flushes the remainder immediately and cancels the deadline", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("last");
    clock.advance(10);
    batcher.flush();
    expect(batches).toEqual(["last"]);
    expect(clock.pendingTimers).toBe(0);
    clock.advance(100);
    batcher.flush();
    expect(batches).toEqual(["last"]);
  });

  it("preserves whitespace, line breaks, combining marks and Unicode", () => {
    const { clock, batches, batcher } = setup();
    const chunks = [" ", "\n", "\u4e2d", "e\u0301", "\ud83d", "\ude42", "\t "];
    for (const chunk of chunks) batcher.push(chunk);
    batcher.flush();
    expect(batches).toEqual([chunks.join("")]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("does not schedule or emit empty input or empty flushes", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("");
    batcher.flush();
    batcher.flush();
    expect(clock.pendingTimers).toBe(0);
    expect(batches).toEqual([]);
  });

  it("does not reset a pending timer for an empty input", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("text");
    clock.advance(49);
    batcher.push("");
    clock.advance(1);
    expect(batches).toEqual(["text"]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("disposes idempotently without flushing or leaving a timer", () => {
    const { clock, batches, batcher } = setup();
    batcher.push("discard");
    batcher.dispose();
    batcher.dispose();
    expect(clock.pendingTimers).toBe(0);
    clock.advance(500);
    expect(batches).toEqual([]);
    expect(() => batcher.push("late")).toThrow(/disposed/i);
    expect(() => batcher.flush()).toThrow(/disposed/i);
  });

  it("clears the old buffer and timer before a reentrant sink starts a new batch", () => {
    const clock = new FixedClock("2026-10-19T12:00:00.000Z");
    const batches: string[] = [];
    const batcher = new ChunkBatcher(clock, (text) => {
      batches.push(text);
      if (batches.length === 1) batcher.push("next");
    });
    batcher.push("first");
    clock.advance(50);
    expect(batches).toEqual(["first"]);
    expect(clock.pendingTimers).toBe(1);
    clock.advance(50);
    expect(batches).toEqual(["first", "next"]);
    expect(clock.pendingTimers).toBe(0);
  });

  it("surfaces sink errors without retaining the flushed text or timer", () => {
    const clock = new FixedClock("2026-10-19T12:00:00.000Z");
    const error = new Error("delivery failed");
    let calls = 0;
    const batcher = new ChunkBatcher(clock, () => {
      calls++;
      throw error;
    });
    batcher.push("text");
    expect(() => clock.advance(50)).toThrow(error);
    expect(clock.pendingTimers).toBe(0);
    batcher.flush();
    batcher.dispose();
    expect(calls).toBe(1);
  });
});
