import type { Disposable } from "./Disposable";

/** Time and timers, injected so tests control them. Implemented by `adapters/systemClock` (#14). */
export interface ClockPort {
  now(): Date;
  /** The user's IANA time zone, e.g. "Europe/Amsterdam". */
  timeZone(): string;
  /** Runs `callback` once after `ms`; disposing cancels it. Drives batching and debouncing. */
  setTimeout(callback: () => void, ms: number): Disposable;
}
