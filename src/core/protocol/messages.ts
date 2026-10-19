import type {
  AssistantTurn,
  Availability,
  TabKey,
  Turn,
  TurnStatus,
  Usage,
  UserTurn,
} from "../types";

export const PROTOCOL_VERSION = 1;
export const MAX_SEND_BYTES = 100_000;

export type StreamingTurn = Pick<AssistantTurn, "id" | "text" | "model" | "at">;

export interface TabView {
  readonly key: TabKey;
  readonly label: string;
  readonly turns: readonly Turn[];
  readonly streaming: StreamingTurn | null;
  readonly error?: string;
}

export interface ViewState {
  readonly tabs: readonly TabView[];
  readonly activeTab: TabKey | null;
  readonly availability: Extract<Availability, { state: "ready" | "missing" }>;
}

interface Envelope<Type extends string> {
  readonly v: typeof PROTOCOL_VERSION;
  readonly type: Type;
}

export type WebviewMessage =
  Envelope<"ready"> | (Envelope<"send"> & { readonly tabKey: TabKey; readonly text: string });

export type HostMessage =
  | (Envelope<"snapshot"> & { readonly state: ViewState })
  | (Envelope<"turnStarted"> & {
      readonly tabKey: TabKey;
      readonly turnId: string;
      readonly userTurn: UserTurn;
      readonly model: AssistantTurn["model"];
      readonly at: string;
    })
  | (Envelope<"chunk"> & {
      readonly tabKey: TabKey;
      readonly turnId: string;
      readonly text: string;
    })
  | (Envelope<"turnEnded"> & {
      readonly tabKey: TabKey;
      readonly turnId: string;
      readonly status: TurnStatus;
      readonly usage?: Usage;
      readonly error?: string;
    })
  | (Envelope<"error"> & {
      readonly tabKey?: TabKey;
      readonly message: string;
    });

type HostPayload<Type extends HostMessage["type"]> = Omit<
  Extract<HostMessage, { type: Type }>,
  "v" | "type"
>;

export const hostMessages = {
  snapshot(state: ViewState): Extract<HostMessage, { type: "snapshot" }> {
    void state;
    throw new Error("Not implemented");
  },
  turnStarted(payload: HostPayload<"turnStarted">): Extract<HostMessage, { type: "turnStarted" }> {
    void payload;
    throw new Error("Not implemented");
  },
  chunk(tabKey: TabKey, turnId: string, text: string): Extract<HostMessage, { type: "chunk" }> {
    void tabKey;
    void turnId;
    void text;
    throw new Error("Not implemented");
  },
  turnEnded(payload: HostPayload<"turnEnded">): Extract<HostMessage, { type: "turnEnded" }> {
    void payload;
    throw new Error("Not implemented");
  },
  error(message: string, tabKey?: TabKey): Extract<HostMessage, { type: "error" }> {
    void message;
    void tabKey;
    throw new Error("Not implemented");
  },
};
