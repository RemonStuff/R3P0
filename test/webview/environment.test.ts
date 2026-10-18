import { describe, expect, it } from "vitest";

describe("webview test environment", () => {
  it("DOM tests run in happy-dom: document and window exist", () => {
    expect(typeof window).toBe("object");
    document.body.innerHTML = '<button id="send">Send</button>';
    expect(document.getElementById("send")?.textContent).toBe("Send");
  });

  it("DOM tests also refuse vscode", async () => {
    await expect(import("vscode")).rejects.toThrow(/must not import vscode/);
  });
});
