import type { Disposable } from "../../src/ports/Disposable";

/** A minimal event emitter for fakes: `event` subscribes, `fire` notifies. */
export class Emitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  };

  fire(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
