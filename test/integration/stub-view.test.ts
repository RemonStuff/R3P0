import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { R3P0_ID } from "./support";

interface StubTestApi {
  readonly view: vscode.WebviewView | undefined;
}

interface Contributions {
  activationEvents: string[];
  contributes: {
    viewsContainers: { activitybar: { id: string; title: string; icon: string }[] };
    views: Record<string, { id: string; name: string; type: string }[]>;
  };
}

function extension() {
  const result = vscode.extensions.getExtension<StubTestApi | undefined>(R3P0_ID);
  assert.ok(result, `${R3P0_ID} is not loaded`);
  return result;
}

async function openView(): Promise<vscode.WebviewView> {
  await vscode.commands.executeCommand("r3p0.chat.focus");
  const api = extension().exports;
  assert.ok(api, "test mode must expose the stub test API");
  const deadline = Date.now() + 5_000;
  while (!api.view && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(api.view, "opening the view must resolve its provider");
  return api.view;
}

describe("R3P0 placeholder view", () => {
  it("contributes the activity-bar container, webview and activation events", () => {
    const manifest: Contributions = extension().packageJSON;
    assert.deepEqual(manifest.contributes.viewsContainers.activitybar, [
      { id: "r3p0", title: "R3P0", icon: "media/r3p0.svg" },
    ]);
    assert.deepEqual(manifest.contributes.views.r3p0, [
      { id: "r3p0.chat", name: "R3P0", type: "webview" },
    ]);
    assert.ok(manifest.activationEvents.includes("onView:r3p0.chat"));
    assert.ok(manifest.activationEvents.includes("onStartupFinished"));
  });

  it("activates R3P0 when the view is opened", async () => {
    await vscode.commands.executeCommand("r3p0.chat.focus");
    assert.equal(extension().isActive, true);
  });

  it("returns a stub test API in test mode", async () => {
    const api = await extension().activate();
    assert.ok(api);
    assert.ok("view" in api);
  });

  it("opens the placeholder with only the packaged bundle allowed to run", async () => {
    const view = await openView();
    const { html, options } = view.webview;
    assert.equal(view.visible, true);
    assert.match(html, /R3P0 isn't wired yet/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /http-equiv="Content-Security-Policy"/);
    assert.match(html, /default-src 'none'/);
    assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
    const nonce = /script-src 'nonce-([a-f0-9]{32})'/.exec(html)?.[1];
    assert.ok(nonce, "the script policy must use a fresh nonce");
    const scriptUri = view.webview.asWebviewUri(
      vscode.Uri.joinPath(extension().extensionUri, "dist", "webview.js"),
    );
    assert.ok(html.includes(`<script nonce="${nonce}" src="${scriptUri.toString()}"`));
    assert.equal(options.enableScripts, true);
    assert.notEqual(options.enableCommandUris, true);
    assert.deepEqual(
      options.localResourceRoots?.map((uri) => uri.toString()),
      [vscode.Uri.joinPath(extension().extensionUri, "dist").toString()],
    );
  });
});
