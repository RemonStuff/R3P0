import type { HostMessage, WebviewMessage } from "./messages";

export type ParseResult<Message> =
  { readonly ok: true; readonly msg: Message } | { readonly ok: false; readonly reason: string };

export function parseWebviewMessage(raw: unknown): ParseResult<WebviewMessage> {
  void raw;
  return { ok: false, reason: "Not implemented" };
}

export function parseHostMessage(raw: unknown): ParseResult<HostMessage> {
  void raw;
  return { ok: false, reason: "Not implemented" };
}
