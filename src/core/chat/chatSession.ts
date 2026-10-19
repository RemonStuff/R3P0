import type { BudgetPort } from "../../ports/BudgetPort";
import type { CancellationSignal } from "../../ports/CancellationSignal";
import type { ClockPort } from "../../ports/ClockPort";
import { hostMessages, PROTOCOL_VERSION } from "../protocol/messages";
import type { HostMessage, StreamingTurn } from "../protocol/messages";
import { parseWebviewMessage } from "../protocol/parse";
import type { AssistantTurn, Reply, ReplyOutcome, TabKey, Turn, UserTurn } from "../types";
import { ChunkBatcher } from "./chunkBatcher";

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

interface ActiveTurn {
  assistant: StreamingTurn;
}

type Attempt<Value> = { ok: true; value: Value } | { ok: false; error: unknown };

export class ChatSession {
  private readonly options: ChatSessionOptions;
  private readonly turns: Turn[] = [];
  private phase: ChatSessionState["phase"] = "idle";
  private active: ActiveTurn | undefined;
  private nextId = 0;

  constructor(options: ChatSessionOptions) {
    this.options = { ...options, model: { ...options.model } };
  }

  snapshot(): ChatSessionState {
    return structuredClone({
      phase: this.phase,
      turns: this.turns,
      streaming: this.active?.assistant ?? null,
    });
  }

  async send(text: string, signal: CancellationSignal): Promise<void> {
    if (this.phase !== "idle") return;
    const parsed = parseWebviewMessage({
      v: PROTOCOL_VERSION,
      type: "send",
      tabKey: this.options.tabKey,
      text,
    });
    if (!parsed.ok) throw new Error(parsed.reason);
    if (parsed.msg.type !== "send") throw new Error("Expected a send message");

    const at = this.options.clock.now().toISOString();
    const userTurn: UserTurn = {
      id: `turn-${++this.nextId}`,
      role: "user",
      text: parsed.msg.text,
      attachments: [],
      at,
    };
    const active: ActiveTurn = {
      assistant: { id: `turn-${++this.nextId}`, text: "", model: this.options.model, at },
    };
    const turnId = active.assistant.id;
    const tabKey = this.options.tabKey;
    let deliveryFailure: { error: unknown } | undefined;
    const batcher = new ChunkBatcher(this.options.clock, (chunk) => {
      if (deliveryFailure) return;
      try {
        this.emit(hostMessages.chunk(tabKey, turnId, chunk));
      } catch (error) {
        // Drain the metered reply before rejecting, including failures on the timer's stack.
        deliveryFailure = { error };
      }
    });
    this.phase = "sending";
    this.turns.push(userTurn);
    this.active = active;
    try {
      this.emit(
        hostMessages.turnStarted({
          tabKey,
          turnId,
          userTurn,
          model: active.assistant.model,
          at,
        }),
      );
      const outcome = await this.consume(active, signal, batcher);
      const assistant = this.finish(active, outcome);
      batcher.flush();
      if (deliveryFailure) throw deliveryFailure.error;
      this.emit(
        hostMessages.turnEnded({
          tabKey,
          turnId,
          status: assistant.status,
          ...(assistant.usage === undefined ? {} : { usage: assistant.usage }),
          ...(assistant.error === undefined ? {} : { error: assistant.error }),
        }),
      );
    } catch (error) {
      if (this.active === active) {
        this.finish(active, { status: "failed", message: failureMessage(error) });
      }
      throw error;
    } finally {
      batcher.dispose();
      this.phase = "idle";
    }
  }

  private async consume(
    active: ActiveTurn,
    signal: CancellationSignal,
    batcher: ChunkBatcher,
  ): Promise<ReplyOutcome> {
    const request = await attempt(() =>
      this.options.budget.send(
        {
          subject: this.options.subject,
          model: { vendor: this.options.model.vendor, id: this.options.model.id },
          messages: this.turns.map((turn) => ({ role: turn.role, content: turn.text })),
        },
        signal,
      ),
    );
    if (!request.ok) return { status: "failed", message: failureMessage(request.error) };

    this.phase = "streaming";
    const reply = request.value;
    // Observe rejection immediately, but wait for the outcome only after consuming the stream.
    const completion = attempt(() => reply.outcome);
    let streamFailure: { error: unknown } | undefined;
    for await (const chunk of readChunks(reply)) {
      if (!chunk.ok) {
        streamFailure = chunk;
        break;
      }
      active.assistant = { ...active.assistant, text: active.assistant.text + chunk.value };
      batcher.push(chunk.value);
    }
    const result = await completion;
    if (!result.ok) {
      return {
        status: "failed",
        message: failureMessage(streamFailure ? streamFailure.error : result.error),
      };
    }
    if (streamFailure) {
      return {
        status: "failed",
        message: failureMessage(streamFailure.error),
        ...(result.value.usage === undefined ? {} : { usage: result.value.usage }),
      };
    }
    return result.value;
  }

  private finish(active: ActiveTurn, outcome: ReplyOutcome): AssistantTurn {
    const assistant: AssistantTurn = {
      ...active.assistant,
      role: "assistant",
      status: outcome.status,
      ...(outcome.usage === undefined ? {} : { usage: { ...outcome.usage } }),
      ...(outcome.status === "failed" ? { error: outcome.message } : {}),
    };
    this.turns.push(assistant);
    this.active = undefined;
    return assistant;
  }

  private emit(message: HostMessage): void {
    this.options.emit(structuredClone(message));
  }
}

async function attempt<Value>(operation: () => Promise<Value>): Promise<Attempt<Value>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, error };
  }
}

async function* readChunks(reply: Reply): AsyncGenerator<Attempt<string>> {
  try {
    for await (const text of reply.chunks) yield { ok: true, value: text };
  } catch (error) {
    yield { ok: false, error };
  }
}

function failureMessage(error: unknown): string {
  try {
    const message = error instanceof Error ? error.message : error;
    if (typeof message === "string" && message.trim() !== "") return message;
  } catch {
    // Even inspecting a thrown value can fail, for example an extension's revoked proxy.
  }
  return "The request failed";
}
