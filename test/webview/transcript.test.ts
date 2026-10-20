import { beforeEach, describe, expect, it } from "vitest";
import type { Transcript } from "../../src/core/ui/state";
import type { TurnStatus } from "../../src/core/types";
import { renderTranscript } from "../../src/webview/view/transcript";
import { assistantTurn, at, model, userTurn } from "../unit/protocol/fixtures";

describe("plain-text transcript", () => {
  let transcript: HTMLOListElement;

  beforeEach(() => {
    document.body.replaceChildren();
    transcript = document.createElement("ol");
    document.body.append(transcript);
  });

  function render(value: Transcript): void {
    renderTranscript(transcript, value);
  }

  it("renders user and assistant turns in order", () => {
    render({ turns: [userTurn, assistantTurn], streaming: null });
    expect([...transcript.children].map((child) => child.getAttribute("data-role"))).toEqual([
      "user",
      "assistant",
    ]);
    expect([...transcript.querySelectorAll(".turn-text")].map((node) => node.textContent)).toEqual([
      "Hello",
      "Hi",
    ]);
    expect(transcript.textContent).toContain("You");
    expect(transcript.textContent).toContain("Assistant");
  });

  it("sets user and assistant text with textContent, never interpreted HTML", () => {
    const hostile = '<script>alert("secret")</script><img src=x onerror=alert(1)>';
    render({
      turns: [
        { ...userTurn, text: hostile },
        { ...assistantTurn, text: hostile, error: hostile, status: "failed" },
      ],
      streaming: null,
    });
    expect([...transcript.querySelectorAll(".turn-text")].map((node) => node.textContent)).toEqual([
      hostile,
      hostile,
    ]);
    expect(transcript.querySelector(".turn-error")?.textContent).toBe(hostile);
    expect(transcript.querySelector("script, img")).toBeNull();
  });

  it("preserves whitespace, newlines and Unicode exactly", () => {
    const text = "  first\n\n🙂 e\u0301 \tlast  ";
    render({ turns: [{ ...assistantTurn, text }], streaming: null });
    expect(transcript.querySelector(".turn-text")?.textContent).toBe(text);
  });

  it.each(["", "  partial\n<script>not HTML</script>"])(
    "shows a typing indicator for a streaming reply with text %j",
    (text) => {
      render({
        turns: [userTurn],
        streaming: { id: "stream", text, model, at },
      });
      expect(transcript.children).toHaveLength(2);
      expect(transcript.lastElementChild?.querySelector(".turn-text")?.textContent).toBe(text);
      expect(transcript.querySelector('[role="status"]')?.textContent).toBe("Replying...");
      expect(transcript.querySelector("script")).toBeNull();
    },
  );

  it.each([
    ["complete", ""],
    ["stopped-by-user", "Stopped by you"],
    ["stopped-by-budget", "Budget limit reached"],
    ["failed", "Reply failed"],
    ["interrupted", "Reply interrupted"],
  ] satisfies readonly (readonly [TurnStatus, string])[])(
    "preserves the terminal status %s without a typing indicator",
    (status, label) => {
      render({ turns: [{ ...assistantTurn, status }], streaming: null });
      expect(transcript.firstElementChild?.getAttribute("data-status")).toBe(status);
      expect(transcript.querySelector('[role="status"]')).toBeNull();
      if (label) expect(transcript.textContent).toContain(label);
    },
  );

  it("replaces only the owned transcript when a snapshot changes or clears it", () => {
    const sibling = document.createElement("button");
    sibling.textContent = "Unrelated UI";
    document.body.prepend(sibling);
    render({ turns: [userTurn], streaming: { id: "stream", text: "partial", model, at } });
    render({ turns: [userTurn, assistantTurn], streaming: null });
    expect(transcript.children).toHaveLength(2);
    expect(transcript.textContent).not.toContain("partial");
    render({ turns: [], streaming: null });
    expect(transcript.children).toHaveLength(0);
    expect(sibling.isConnected).toBe(true);
    expect(sibling.textContent).toBe("Unrelated UI");
  });
});
