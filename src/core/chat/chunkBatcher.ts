import type { ClockPort } from "../../ports/ClockPort";
import type { Disposable } from "../../ports/Disposable";

export class ChunkBatcher implements Disposable {
  constructor(clock: ClockPort, emit: (text: string) => void) {
    void clock;
    void emit;
  }

  push(text: string): void {
    void text;
  }

  flush(): void {}

  dispose(): void {}
}
