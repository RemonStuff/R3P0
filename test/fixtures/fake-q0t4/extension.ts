// Test-only extension that pretends to be Q0T4 (RemonStuff.q0t4). It exports
// FakeQ0T4Api, the same scripted fake the unit tests use, instantiated with the
// real vscode types. Bundled to dist/extension.js by test/fixtures/build.mjs.
import * as vscode from "vscode";
import type { VscodeQ0T4Types } from "../../../src/adapters/q0t4Types";
import type { UsageChange } from "../../../src/ports/q0t4Api";
import { FakeQ0T4Api, type FakeQ0T4Script } from "../../fakes/fakeQ0T4Api";

function textOf(message: vscode.LanguageModelChatMessage): string {
  return message.content
    .map((part) => (part instanceof vscode.LanguageModelTextPart ? part.value : ""))
    .join("");
}

export function activate(context: vscode.ExtensionContext): unknown {
  const version = process.env.FAKE_Q0T4_API_VERSION;
  const fake = new FakeQ0T4Api<VscodeQ0T4Types>({
    ...(version ? { apiVersion: Number(version) } : {}),
    describeModel: (model) => ({ vendor: model.vendor, id: model.id }),
    textOf,
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("fake-q0t4.script", (script: FakeQ0T4Script) =>
      fake.script(script),
    ),
    vscode.commands.registerCommand("fake-q0t4.calls", () => fake.calls()),
    vscode.commands.registerCommand("fake-q0t4.reset", () => fake.reset()),
    vscode.commands.registerCommand("fake-q0t4.emitUsage", (change: UsageChange) =>
      fake.emitUsage(change),
    ),
    // Q0T4's real command (Q0T4 #57): allow the reserve for a subject this week.
    vscode.commands.registerCommand("q0t4.allowReserve", (subject: string) =>
      fake.allowReserve(subject),
    ),
  );
  return fake.exports;
}

export function deactivate(): void {}
