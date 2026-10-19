import type { ClockPort } from "../../ports/ClockPort";
import type { Disposable } from "../../ports/Disposable";

const FLUSH_MS = 50;
const FLUSH_BYTES = 2048;

export class ChunkBatcher implements Disposable {
  private readonly encoder = new TextEncoder();
  private buffer = "";
  private timer: Disposable | undefined;
  private disposed = false;

  constructor(
    private readonly clock: ClockPort,
    private readonly emit: (text: string) => void,
  ) {}

  push(text: string): void {
    this.assertOpen();
    if (text === "") return;
    this.buffer += text;
    if (this.encoder.encode(this.buffer).byteLength >= FLUSH_BYTES) {
      this.flush();
      return;
    }
    this.timer ??= this.clock.setTimeout(() => this.flush(), FLUSH_MS);
  }

  flush(): void {
    this.assertOpen();
    const text = this.buffer;
    this.buffer = "";
    this.clearTimer();
    if (text !== "") this.emit(text);
  }

  dispose(): void {
    this.disposed = true;
    this.buffer = "";
    this.clearTimer();
  }

  private clearTimer(): void {
    this.timer?.dispose();
    this.timer = undefined;
  }

  private assertOpen(): void {
    if (this.disposed) throw new Error("ChunkBatcher is disposed");
  }
}
