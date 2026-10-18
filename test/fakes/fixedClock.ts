import type { ClockPort } from "../../src/ports/ClockPort";
import type { Disposable } from "../../src/ports/Disposable";

interface Timer {
  readonly due: number;
  readonly seq: number;
  readonly callback: () => void;
}

/**
 * A clock that only moves when a test says so. Timers run synchronously inside
 * `advance`/`set`, in due order, each seeing the time it was due at.
 */
export class FixedClock implements ClockPort {
  private time: number;
  private seq = 0;
  private timers: Timer[] = [];

  constructor(
    iso: string,
    private readonly zone = "UTC",
  ) {
    this.time = Date.parse(iso);
  }

  now(): Date {
    return new Date(this.time);
  }

  timeZone(): string {
    return this.zone;
  }

  setTimeout(callback: () => void, ms: number): Disposable {
    const timer = { due: this.time + ms, seq: this.seq++, callback };
    this.timers.push(timer);
    return { dispose: () => (this.timers = this.timers.filter((t) => t !== timer)) };
  }

  get pendingTimers(): number {
    return this.timers.length;
  }

  advance(ms: number): void {
    if (ms < 0) throw new Error("FixedClock can't go backwards");
    this.runUntil(this.time + ms);
  }

  set(iso: string): void {
    const target = Date.parse(iso);
    if (target < this.time) throw new Error("FixedClock can't go backwards");
    this.runUntil(target);
  }

  private runUntil(target: number): void {
    for (;;) {
      const next = this.timers
        .filter((t) => t.due <= target)
        .sort((a, b) => a.due - b.due || a.seq - b.seq)[0];
      if (!next) break;
      this.timers = this.timers.filter((t) => t !== next);
      this.time = next.due;
      next.callback();
    }
    this.time = target;
  }
}
