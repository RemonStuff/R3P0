import type { BudgetPort } from "../../ports/BudgetPort";
import type { CancellationSignal } from "../../ports/CancellationSignal";
import type { ClockPort } from "../../ports/ClockPort";
import type { HostMessage, StreamingTurn } from "../protocol/messages";
import type { AssistantTurn, TabKey, Turn } from "../types";

export interface ChatSessionOptions {
  readonly tabKey: TabKey;
  readonly subject: string;
  readonly model: AssistantTurn["model"];
  readonly budget: BudgetPort;
  readonly clock: ClockPort;
  readonly emit: (message: HostMessage) => void;
}

export interface ChatSessionState {
  readonly phase: "idle" | "sending" | "streaming";
  readonly turns: readonly Turn[];
  readonly streaming: StreamingTurn | null;
}

export class ChatSession {
  constructor(options: ChatSessionOptions) {
    void options;
  }

  snapshot(): ChatSessionState {
    return { phase: "idle", turns: [], streaming: null };
  }

  async send(text: string, signal: CancellationSignal): Promise<void> {
    void text;
    void signal;
  }
}
