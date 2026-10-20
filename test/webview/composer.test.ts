import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SEND_BYTES } from "../../src/core/protocol/messages";
import { createInitialState } from "../../src/core/ui/state";
import { createComposer } from "../../src/webview/view/composer";
import { at, model, state, tabKey } from "../unit/protocol/fixtures";

const ready = {
  ...state,
  tabs: [{ key: tabKey, label: "r3p0", turns: [], streaming: null }],
};

describe("message composer", () => {
  const onSend = vi.fn();
  const onDraftChange = vi.fn();
  let root: HTMLDivElement;
  let composer: ReturnType<typeof createComposer>;
  let input: HTMLTextAreaElement;
  let send: HTMLButtonElement;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
    root = document.createElement("div");
    document.body.append(root);
    composer = createComposer(root, { draft: "", onSend, onDraftChange });
    composer.update(ready);
    input = root.querySelector("textarea")!;
    send = root.querySelector('button[type="submit"]')!;
  });

  afterEach(() => composer.dispose());

  function type(text: string): void {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function enter(options: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...options,
    });
    input.dispatchEvent(event);
    return event;
  }

  it("labels the textarea and Send button accessibly", () => {
    expect(root.querySelector("label")?.htmlFor).toBe(input.id);
    expect(root.querySelector("label")?.textContent).toBe("Message");
    expect(send.textContent).toBe("Send");
  });

  it("Enter posts send with trimmed text, clears and persists the empty draft", () => {
    type("  Hello\nworld  ");
    expect(enter().defaultPrevented).toBe(true);
    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      v: 1,
      type: "send",
      tabKey,
      text: "Hello\nworld",
    });
    expect(input.value).toBe("");
    expect(onDraftChange).toHaveBeenLastCalledWith("");
    expect(send.disabled).toBe(true);
  });

  it("Send submits the same validated message as Enter", () => {
    type("  Button message  ");
    send.click();
    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      v: 1,
      type: "send",
      tabKey,
      text: "Button message",
    });
    expect(input.value).toBe("");
  });

  it("Shift+Enter leaves the browser's newline behaviour intact and does not send", () => {
    type("line one");
    expect(enter({ shiftKey: true }).defaultPrevented).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toBe("line one");
  });

  it("does not submit while an IME is composing or a key is repeating", () => {
    type("draft");
    enter({ isComposing: true });
    enter({ repeat: true });
    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toBe("draft");
  });

  it.each(["", " \n\t "])("disables Send for blank text %j", (text) => {
    type(text);
    expect(send.disabled).toBe(true);
    enter();
    root.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it.each([
    createInitialState(),
    { ...ready, availability: { state: "missing" } as const },
    { ...ready, activeTab: null },
    { ...ready, activeTab: "unknown" },
    { ...ready, tabs: [] },
    {
      ...ready,
      tabs: [
        {
          ...ready.tabs[0]!,
          streaming: { id: "stream", text: "", model, at },
        },
      ],
    },
  ])("refuses input when selectors disable it: %j", (disabledState) => {
    type("keep this draft");
    composer.update(disabledState);
    expect(input.disabled).toBe(true);
    expect(send.disabled).toBe(true);
    enter();
    root.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toBe("keep this draft");
    composer.update(ready);
    expect(input.disabled).toBe(false);
    expect(send.disabled).toBe(false);
  });

  it.each(["a".repeat(MAX_SEND_BYTES), "🙂".repeat(MAX_SEND_BYTES / 4)])(
    "accepts exactly the protocol UTF-8 byte limit",
    (text) => {
      type(`  ${text}  `);
      expect(send.disabled).toBe(false);
      enter();
      expect(onSend).toHaveBeenCalledExactlyOnceWith({ v: 1, type: "send", tabKey, text });
    },
  );

  it.each(["a".repeat(MAX_SEND_BYTES + 1), `${"🙂".repeat(MAX_SEND_BYTES / 4)}a`])(
    "refuses oversized drafts with an explanation and keeps the draft",
    (text) => {
      type(text);
      expect(send.disabled).toBe(true);
      expect(root.querySelector('[role="status"]')?.textContent).toContain("100,000");
      enter();
      expect(onSend).not.toHaveBeenCalled();
      expect(input.value).toBe(text);
      type("short enough");
      expect(send.disabled).toBe(false);
      expect(root.querySelector('[role="status"]')?.textContent).toBe("");
    },
  );

  it("persists the exact unsent draft on input, without trimming", () => {
    type("  unfinished\n🙂 ");
    expect(onDraftChange).toHaveBeenCalledExactlyOnceWith("  unfinished\n🙂 ");
  });

  it("keeps the textarea node, selection and draft across host updates", () => {
    type("draft");
    input.focus();
    input.setSelectionRange(1, 3);
    composer.update({ ...ready, availability: { state: "ready", degraded: ["getStatus"] } });
    expect(root.querySelector("textarea")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    expect(input.value).toBe("draft");
    expect(onDraftChange).toHaveBeenCalledTimes(1);
  });

  it("removes its listeners when disposed", () => {
    type("draft");
    onDraftChange.mockClear();
    composer.dispose();
    enter();
    type("changed");
    root.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(onSend).not.toHaveBeenCalled();
    expect(onDraftChange).not.toHaveBeenCalled();
  });
});
