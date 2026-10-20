import type { Transcript } from "../../core/ui/state";
import type { TurnStatus } from "../../core/types";

const statusLabels: Record<TurnStatus, string> = {
  complete: "",
  "stopped-by-user": "Stopped by you",
  "stopped-by-budget": "Budget limit reached",
  failed: "Reply failed",
  interrupted: "Reply interrupted",
};

export function renderTranscript(root: HTMLElement, transcript: Transcript): void {
  const document = root.ownerDocument;
  const fragment = document.createDocumentFragment();

  function turn(id: string, role: "user" | "assistant", text: string): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "turn";
    item.dataset.turnId = id;
    item.dataset.role = role;
    const label = document.createElement("strong");
    label.textContent = role === "user" ? "You" : "Assistant";
    const content = document.createElement("div");
    content.className = "turn-text";
    content.textContent = text;
    item.append(label, content);
    fragment.append(item);
    return item;
  }

  for (const entry of transcript.turns) {
    const item = turn(entry.id, entry.role, entry.text);
    if (entry.role !== "assistant") continue;
    item.dataset.status = entry.status;
    const statusLabel = statusLabels[entry.status];
    if (statusLabel) {
      const status = document.createElement("p");
      status.className = "turn-status";
      status.textContent = statusLabel;
      item.append(status);
    }
    if (entry.error !== undefined) {
      const error = document.createElement("p");
      error.className = "turn-error";
      error.textContent = entry.error;
      item.append(error);
    }
  }

  if (transcript.streaming !== null) {
    const entry = transcript.streaming;
    const item = turn(entry.id, "assistant", entry.text);
    const indicator = document.createElement("span");
    indicator.className = "typing-indicator";
    indicator.setAttribute("role", "status");
    indicator.textContent = "Replying...";
    item.append(indicator);
  }

  root.replaceChildren(fragment);
}
