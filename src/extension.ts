import * as vscode from "vscode";
import { StubViewProvider } from "./adapters/stubViewProvider";

export interface StubTestApi {
  readonly view: vscode.WebviewView | undefined;
}

export function activate(context: vscode.ExtensionContext): StubTestApi | undefined {
  const provider = new StubViewProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider("r3p0.chat", provider));
  if (context.extensionMode === vscode.ExtensionMode.Test) {
    return {
      get view() {
        return provider.view;
      },
    };
  }
  return undefined;
}

export function deactivate(): void {}
