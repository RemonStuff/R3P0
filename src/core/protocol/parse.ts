import type { AssistantTurn, Turn, TurnStatus, Usage, UserTurn } from "../types";
import {
  hostMessages,
  MAX_SEND_BYTES,
  PROTOCOL_VERSION,
  type HostMessage,
  type StreamingTurn,
  type TabView,
  type ViewState,
  type WebviewMessage,
} from "./messages";

export type ParseResult<Message> =
  { readonly ok: true; readonly msg: Message } | { readonly ok: false; readonly reason: string };

const invalidMessage = Symbol("invalid message");
const turnStatuses = [
  "complete",
  "stopped-by-user",
  "stopped-by-budget",
  "failed",
  "interrupted",
] as const satisfies readonly TurnStatus[];

class Reader {
  // Inspecting an arbitrary thrown value can itself throw, so keep diagnostics here.
  reason = "Message could not be read safely";

  fail(reason: string): never {
    this.reason = reason;
    throw invalidMessage;
  }

  object(raw: unknown, path: string): Record<string, unknown> {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      this.fail(`${path} must be a plain object`);
    }
    const prototype: unknown = Object.getPrototypeOf(raw);
    if (prototype !== null && prototype !== Object.prototype) {
      this.fail(`${path} must be a plain object`);
    }
    return raw as Record<string, unknown>;
  }

  private data(descriptor: PropertyDescriptor, path: string): unknown {
    if (!("value" in descriptor)) this.fail(`${path} must be a data field`);
    return descriptor.value;
  }

  field(raw: object, key: string, path: string): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor) this.fail(`${path} is required`);
    return this.data(descriptor, path);
  }

  optional<Value>(
    raw: object,
    key: string,
    path: string,
    read: (raw: unknown, path: string) => Value,
  ): Value | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    return descriptor ? read(this.data(descriptor, path), path) : undefined;
  }

  text(raw: unknown, path: string): string {
    if (typeof raw !== "string") this.fail(`${path} must be a string`);
    return raw;
  }

  nonempty(raw: unknown, path: string): string {
    const value = this.text(raw, path);
    if (value.trim().length === 0) this.fail(`${path} must not be empty`);
    return value;
  }

  number(raw: unknown, path: string, integer = false): number {
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      this.fail(`${path} must be a finite non-negative number`);
    }
    if (integer && !Number.isSafeInteger(raw)) {
      this.fail(`${path} must be a safe integer`);
    }
    return raw;
  }

  choice<Value extends string>(raw: unknown, values: readonly Value[], path: string): Value {
    const value = values.find((item) => item === raw);
    if (value === undefined) this.fail(`${path} has an unsupported value`);
    return value;
  }

  list<Value>(raw: unknown, path: string, read: (raw: unknown, path: string) => Value): Value[] {
    if (!Array.isArray(raw)) this.fail(`${path} must be an array`);
    const length = this.number(this.field(raw, "length", path), path, true);
    const result: Value[] = [];
    for (let index = 0; index < length; index++) {
      const itemPath = `${path}[${index}]`;
      result.push(read(this.field(raw, String(index), itemPath), itemPath));
    }
    return result;
  }
}

function parse<Message>(
  raw: unknown,
  read: (reader: Reader, raw: Record<string, unknown>) => Message,
): ParseResult<Message> {
  const reader = new Reader();
  try {
    const message = reader.object(raw, "message");
    if (reader.field(message, "v", "v") !== PROTOCOL_VERSION) {
      reader.fail("v must equal protocol version 1");
    }
    return { ok: true, msg: read(reader, message) };
  } catch {
    return { ok: false, reason: reader.reason };
  }
}

function readModel(reader: Reader, raw: unknown, path: string): AssistantTurn["model"] {
  const model = reader.object(raw, path);
  return {
    vendor: reader.nonempty(reader.field(model, "vendor", `${path}.vendor`), `${path}.vendor`),
    id: reader.nonempty(reader.field(model, "id", `${path}.id`), `${path}.id`),
    name: reader.nonempty(reader.field(model, "name", `${path}.name`), `${path}.name`),
  };
}

function readUsage(reader: Reader, raw: unknown, path: string): Usage {
  const usage = reader.object(raw, path);
  return {
    cost: reader.number(reader.field(usage, "cost", `${path}.cost`), `${path}.cost`),
    unit: reader.choice(
      reader.field(usage, "unit", `${path}.unit`),
      ["tokens", "credits"],
      `${path}.unit`,
    ),
    borrowed: reader.number(
      reader.field(usage, "borrowed", `${path}.borrowed`),
      `${path}.borrowed`,
    ),
  };
}

function readUserTurn(reader: Reader, raw: unknown, path: string): UserTurn {
  const turn = reader.object(raw, path);
  reader.choice(reader.field(turn, "role", `${path}.role`), ["user"], `${path}.role`);
  return {
    id: reader.nonempty(reader.field(turn, "id", `${path}.id`), `${path}.id`),
    role: "user",
    text: reader.text(reader.field(turn, "text", `${path}.text`), `${path}.text`),
    attachments: reader.list(
      reader.field(turn, "attachments", `${path}.attachments`),
      `${path}.attachments`,
      (raw, path) => {
        const attachment = reader.object(raw, path);
        return {
          path: reader.nonempty(reader.field(attachment, "path", `${path}.path`), `${path}.path`),
          bytes: reader.number(
            reader.field(attachment, "bytes", `${path}.bytes`),
            `${path}.bytes`,
            true,
          ),
        };
      },
    ),
    at: reader.nonempty(reader.field(turn, "at", `${path}.at`), `${path}.at`),
  };
}

function readTurn(reader: Reader, raw: unknown, path: string): Turn {
  const turn = reader.object(raw, path);
  const role = reader.choice(
    reader.field(turn, "role", `${path}.role`),
    ["user", "assistant"],
    `${path}.role`,
  );
  if (role === "user") return readUserTurn(reader, turn, path);
  const usage = reader.optional(turn, "usage", `${path}.usage`, (raw, path) =>
    readUsage(reader, raw, path),
  );
  const error = reader.optional(turn, "error", `${path}.error`, (raw, path) =>
    reader.text(raw, path),
  );
  return {
    id: reader.nonempty(reader.field(turn, "id", `${path}.id`), `${path}.id`),
    role: "assistant",
    text: reader.text(reader.field(turn, "text", `${path}.text`), `${path}.text`),
    status: reader.choice(
      reader.field(turn, "status", `${path}.status`),
      turnStatuses,
      `${path}.status`,
    ),
    model: readModel(reader, reader.field(turn, "model", `${path}.model`), `${path}.model`),
    at: reader.nonempty(reader.field(turn, "at", `${path}.at`), `${path}.at`),
    ...(usage === undefined ? {} : { usage }),
    ...(error === undefined ? {} : { error }),
  };
}

function readStreamingTurn(reader: Reader, raw: unknown, path: string): StreamingTurn | null {
  if (raw === null) return null;
  const turn = reader.object(raw, path);
  return {
    id: reader.nonempty(reader.field(turn, "id", `${path}.id`), `${path}.id`),
    text: reader.text(reader.field(turn, "text", `${path}.text`), `${path}.text`),
    model: readModel(reader, reader.field(turn, "model", `${path}.model`), `${path}.model`),
    at: reader.nonempty(reader.field(turn, "at", `${path}.at`), `${path}.at`),
  };
}

function readTab(reader: Reader, raw: unknown, path: string): TabView {
  const tab = reader.object(raw, path);
  const error = reader.optional(tab, "error", `${path}.error`, (raw, path) =>
    reader.text(raw, path),
  );
  return {
    key: reader.nonempty(reader.field(tab, "key", `${path}.key`), `${path}.key`),
    label: reader.nonempty(reader.field(tab, "label", `${path}.label`), `${path}.label`),
    turns: reader.list(reader.field(tab, "turns", `${path}.turns`), `${path}.turns`, (raw, path) =>
      readTurn(reader, raw, path),
    ),
    streaming: readStreamingTurn(
      reader,
      reader.field(tab, "streaming", `${path}.streaming`),
      `${path}.streaming`,
    ),
    ...(error === undefined ? {} : { error }),
  };
}

function readState(reader: Reader, raw: unknown): ViewState {
  const state = reader.object(raw, "state");
  const availability = reader.object(
    reader.field(state, "availability", "state.availability"),
    "state.availability",
  );
  const status = reader.choice(
    reader.field(availability, "state", "state.availability.state"),
    ["ready", "missing"],
    "state.availability.state",
  );
  const activeTab = reader.field(state, "activeTab", "state.activeTab");
  return {
    tabs: reader.list(reader.field(state, "tabs", "state.tabs"), "state.tabs", (raw, path) =>
      readTab(reader, raw, path),
    ),
    activeTab: activeTab === null ? null : reader.nonempty(activeTab, "state.activeTab"),
    availability:
      status === "missing"
        ? { state: "missing" }
        : {
            state: "ready",
            degraded: reader.list(
              reader.field(availability, "degraded", "state.availability.degraded"),
              "state.availability.degraded",
              (raw, path) =>
                reader.choice(raw, ["getStatus", "canSpend", "onDidChangeUsage"], path),
            ),
          },
  };
}

export function parseWebviewMessage(raw: unknown): ParseResult<WebviewMessage> {
  return parse<WebviewMessage>(raw, (reader, message) => {
    switch (reader.field(message, "type", "type")) {
      case "ready":
        return { v: PROTOCOL_VERSION, type: "ready" };
      case "send": {
        const tabKey = reader.nonempty(reader.field(message, "tabKey", "tabKey"), "tabKey");
        const text = reader.nonempty(reader.field(message, "text", "text"), "text").trim();
        if (new TextEncoder().encode(text).byteLength > MAX_SEND_BYTES) {
          reader.fail("text exceeds 100,000 UTF-8 bytes after trimming");
        }
        return { v: PROTOCOL_VERSION, type: "send", tabKey, text };
      }
      default:
        return reader.fail("type is not a recognised webview message");
    }
  });
}

export function parseHostMessage(raw: unknown): ParseResult<HostMessage> {
  return parse<HostMessage>(raw, (reader, message) => {
    switch (reader.field(message, "type", "type")) {
      case "snapshot":
        return hostMessages.snapshot(readState(reader, reader.field(message, "state", "state")));
      case "turnStarted":
        return hostMessages.turnStarted({
          tabKey: reader.nonempty(reader.field(message, "tabKey", "tabKey"), "tabKey"),
          turnId: reader.nonempty(reader.field(message, "turnId", "turnId"), "turnId"),
          userTurn: readUserTurn(reader, reader.field(message, "userTurn", "userTurn"), "userTurn"),
          model: readModel(reader, reader.field(message, "model", "model"), "model"),
          at: reader.nonempty(reader.field(message, "at", "at"), "at"),
        });
      case "chunk":
        return hostMessages.chunk(
          reader.nonempty(reader.field(message, "tabKey", "tabKey"), "tabKey"),
          reader.nonempty(reader.field(message, "turnId", "turnId"), "turnId"),
          reader.text(reader.field(message, "text", "text"), "text"),
        );
      case "turnEnded": {
        const usage = reader.optional(message, "usage", "usage", (raw, path) =>
          readUsage(reader, raw, path),
        );
        const error = reader.optional(message, "error", "error", (raw, path) =>
          reader.text(raw, path),
        );
        return hostMessages.turnEnded({
          tabKey: reader.nonempty(reader.field(message, "tabKey", "tabKey"), "tabKey"),
          turnId: reader.nonempty(reader.field(message, "turnId", "turnId"), "turnId"),
          status: reader.choice(reader.field(message, "status", "status"), turnStatuses, "status"),
          ...(usage === undefined ? {} : { usage }),
          ...(error === undefined ? {} : { error }),
        });
      }
      case "error":
        return hostMessages.error(
          reader.nonempty(reader.field(message, "message", "message"), "message"),
          reader.optional(message, "tabKey", "tabKey", (raw, path) => reader.nonempty(raw, path)),
        );
      default:
        return reader.fail("type is not a recognised host message");
    }
  });
}
