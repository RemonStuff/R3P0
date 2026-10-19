import { describe, expect, it } from "vitest";
import { hostMessages } from "../../src/core/protocol/messages";
import { parseHostMessage, parseWebviewMessage } from "../../src/core/protocol/parse";
import { state, tabKey } from "../unit/protocol/fixtures";

describe("shared protocol in the browser environment", () => {
  it("parses host snapshots without Node or VS Code APIs", () => {
    const msg = hostMessages.snapshot(state);
    expect(parseHostMessage(JSON.parse(JSON.stringify(msg)))).toEqual({ ok: true, msg });
  });

  it("uses UTF-8 byte limits in the webview too", () => {
    const send = { v: 1, type: "send", tabKey, text: "🙂".repeat(25_000) };
    expect(parseWebviewMessage(send)).toEqual({ ok: true, msg: send });
    expect(parseWebviewMessage({ ...send, text: `${send.text}a` }).ok).toBe(false);
  });
});
