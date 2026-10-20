import { PROTOCOL_VERSION, type WebviewMessage } from "../core/protocol/messages";
import { parseHostMessage } from "../core/protocol/parse";
import { reduce } from "../core/ui/reducer";
import { selectTranscript } from "../core/ui/selectors";
import { createInitialState } from "../core/ui/state";
import { createComposer } from "./view/composer";
import { renderTranscript } from "./view/transcript";
import "./styles.css";

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: { draft: string }): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

function start(root: HTMLElement): void {
  const api = acquireVsCodeApi();
  const saved = api.getState();
  const draft =
    typeof saved === "object" &&
    saved !== null &&
    "draft" in saved &&
    typeof saved.draft === "string"
      ? saved.draft
      : "";
  let state = createInitialState();
  const availability = document.createElement("p");
  availability.setAttribute("role", "status");
  const globalError = document.createElement("p");
  globalError.className = "error-banner";
  globalError.setAttribute("role", "alert");
  const tabError = document.createElement("p");
  tabError.className = "error-banner";
  tabError.setAttribute("role", "alert");
  const transcript = document.createElement("ol");
  transcript.className = "transcript";
  transcript.setAttribute("role", "log");
  transcript.setAttribute("aria-label", "Conversation");
  transcript.setAttribute("aria-live", "polite");
  transcript.setAttribute("aria-relevant", "additions text");
  const composerRoot = document.createElement("div");
  root.classList.add("r3p0-chat");
  root.replaceChildren(availability, globalError, tabError, transcript, composerRoot);
  const composer = createComposer(composerRoot, {
    draft,
    onSend: (message) => api.postMessage(message),
    onDraftChange: (draft) => api.setState({ draft }),
  });

  function render(): void {
    const active = state.tabs.find((tab) => tab.key === state.activeTab);
    availability.textContent =
      active === undefined
        ? "Waiting for a repository snapshot."
        : state.availability.state === "missing"
          ? "Q0T4 is unavailable. Sending is disabled."
          : "";
    globalError.textContent = state.globalError ?? "";
    tabError.textContent = active?.error ?? "";
    renderTranscript(transcript, selectTranscript(state));
    composer.update(state);
  }

  function receive(event: MessageEvent<unknown>): void {
    const parsed = parseHostMessage(event.data);
    if (!parsed.ok) {
      console.warn("R3P0 ignored an invalid host message:", parsed.reason);
      return;
    }
    const next = reduce(state, parsed.msg);
    if (next === state) return;
    state = next;
    render();
  }

  render();
  window.addEventListener("message", receive);
  window.addEventListener(
    "pagehide",
    () => {
      window.removeEventListener("message", receive);
      composer.dispose();
    },
    { once: true },
  );
  api.postMessage({ v: PROTOCOL_VERSION, type: "ready" });
}

// The iteration 0 provider has no chat root; #13 supplies it with the real channel.
const root = document.getElementById("r3p0-root");
if (root !== null) start(root);
