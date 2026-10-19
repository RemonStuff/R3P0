import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

export class StubViewProvider implements vscode.WebviewViewProvider {
  view: vscode.WebviewView | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    const nonce = randomBytes(16).toString("hex");
    const bundleRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
    const scriptUri = view.webview.asWebviewUri(vscode.Uri.joinPath(bundleRoot, "webview.js"));
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [bundleRoot],
    };
    view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>R3P0</title>
</head>
<body>
  <h1>R3P0 isn't wired yet</h1>
  <p>This is the iteration 0 placeholder. Chat and Q0T4 integration are not connected yet.</p>
  <script nonce="${nonce}" src="${scriptUri.toString()}" defer></script>
</body>
</html>`;
    this.view = view;
    view.onDidDispose(() => {
      this.view = undefined;
    });
  }
}
