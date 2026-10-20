import { PROTOCOL_VERSION, type WebviewMessage } from "../../core/protocol/messages";
import { parseWebviewMessage } from "../../core/protocol/parse";
import { isInputEnabled } from "../../core/ui/selectors";
import { createInitialState, type UiState } from "../../core/ui/state";

interface ComposerOptions {
  readonly draft: string;
  readonly onSend: (message: Extract<WebviewMessage, { type: "send" }>) => void;
  readonly onDraftChange: (draft: string) => void;
}

export function createComposer(root: HTMLElement, options: ComposerOptions) {
  const document = root.ownerDocument;
  const form = document.createElement("form");
  form.className = "composer";
  const label = document.createElement("label");
  label.htmlFor = "r3p0-input";
  label.textContent = "Message";
  const input = document.createElement("textarea");
  input.id = label.htmlFor;
  input.rows = 3;
  input.value = options.draft;
  input.setAttribute("aria-describedby", "r3p0-composer-help r3p0-composer-error");
  const help = document.createElement("p");
  help.id = "r3p0-composer-help";
  help.textContent = "Enter to send. Shift+Enter for a new line.";
  const validation = document.createElement("p");
  validation.id = "r3p0-composer-error";
  validation.className = "composer-error";
  validation.setAttribute("role", "status");
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Send";
  form.append(label, input, help, validation, send);
  root.replaceChildren(form);
  let state = createInitialState();

  function message() {
    return parseWebviewMessage({
      v: PROTOCOL_VERSION,
      type: "send",
      tabKey: state.activeTab,
      text: input.value,
    });
  }

  function refresh(): void {
    const enabled = isInputEnabled(state);
    const parsed = message();
    input.disabled = !enabled;
    send.disabled = !enabled || !parsed.ok;
    validation.textContent =
      enabled && input.value.trim() !== "" && !parsed.ok ? parsed.reason : "";
    input.setAttribute("aria-invalid", String(validation.textContent !== ""));
  }

  function submit(event: Event): void {
    event.preventDefault();
    if (!isInputEnabled(state)) return;
    const parsed = message();
    if (!parsed.ok || parsed.msg.type !== "send") {
      refresh();
      return;
    }
    options.onSend(parsed.msg);
    input.value = "";
    options.onDraftChange("");
    refresh();
    input.focus();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!event.repeat) submit(event);
  }

  function changed(): void {
    options.onDraftChange(input.value);
    refresh();
  }

  form.addEventListener("submit", submit);
  input.addEventListener("keydown", keydown);
  input.addEventListener("input", changed);
  refresh();

  return {
    update(next: UiState): void {
      state = next;
      refresh();
    },
    dispose(): void {
      form.removeEventListener("submit", submit);
      input.removeEventListener("keydown", keydown);
      input.removeEventListener("input", changed);
    },
  };
}
