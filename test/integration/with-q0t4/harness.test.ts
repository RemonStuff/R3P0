import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import type { MeteredResponse } from "../../../src/ports/q0t4Api";
import type { VscodeQ0T4Api } from "../../../src/adapters/q0t4Types";
import { FAKE_VENDOR, Q0T4_ID, R3P0_ID, fakeModel, fakeQ0T4Calls } from "../support";

async function fakeQ0T4(): Promise<VscodeQ0T4Api> {
  const extension = vscode.extensions.getExtension<VscodeQ0T4Api>(Q0T4_ID);
  assert.ok(extension, `${Q0T4_ID} (the fake) is not loaded`);
  return extension.activate();
}

async function collect(response: MeteredResponse): Promise<string> {
  let text = "";
  for await (const part of response.stream) text += part;
  return text;
}

describe("integration harness (with the fake Q0T4)", () => {
  beforeEach(() => vscode.commands.executeCommand("fake-q0t4.reset"));

  it("R3P0 extension is present in the test instance", () => {
    assert.ok(vscode.extensions.getExtension(R3P0_ID), `${R3P0_ID} is not loaded`);
  });

  it("fake Q0T4 is found as RemonStuff.q0t4 and activate() returns apiVersion 1 with forExtension", async () => {
    const api = await fakeQ0T4();
    assert.equal(api.apiVersion, 1);
    assert.equal(typeof api.forExtension, "function");
  });

  it("the fake q0t4.allowReserve command is registered", async () => {
    await fakeQ0T4();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("q0t4.allowReserve"));
  });

  it('fake LM provider models are visible via selectChatModels({ vendor: "r3p0-test" })', async () => {
    const model = await fakeModel();
    assert.equal(model.vendor, FAKE_VENDOR);
  });

  it("the fake Q0T4 streams scripted text for a real model object and records the call", async () => {
    const client = (await fakeQ0T4()).forExtension(R3P0_ID);
    await vscode.commands.executeCommand("fake-q0t4.script", {
      replies: [{ chunks: ["Hel", "lo"], cost: 3 }],
    });
    const model = await fakeModel();
    const token = new vscode.CancellationTokenSource().token;
    const response = await client.sendRequest(
      "test-owner/origin-repo",
      model,
      [vscode.LanguageModelChatMessage.User("Hi")],
      undefined,
      token,
    );
    assert.equal(await collect(response), "Hello");

    const calls = await fakeQ0T4Calls();
    assert.deepEqual(calls.extensionIds, [R3P0_ID]);
    assert.deepEqual(calls.sendRequest, [
      {
        subject: "test-owner/origin-repo",
        model: { vendor: FAKE_VENDOR, id: model.id },
        messages: ["Hi"],
      },
    ]);
  });

  it("the fake LM provider refuses any request, so nothing can bypass Q0T4", async () => {
    const model = await fakeModel();
    await assert.rejects(async () => {
      const response = await model.sendRequest([vscode.LanguageModelChatMessage.User("hi")]);
      for await (const part of response.text) void part;
    }, /must never send/);
  });

  it("the test workspace has 4 folders and the git repos have the scripted remotes", async () => {
    const folders = vscode.workspace.workspaceFolders ?? [];
    assert.deepEqual(
      folders.map((f) => f.name),
      ["origin-repo", "upstream-only", "no-remote", "plain-folder"],
    );
    const git = vscode.extensions.getExtension<{
      getAPI(v: 1): {
        state: string;
        onDidChangeState(cb: (s: string) => void): vscode.Disposable;
        repositories: {
          rootUri: vscode.Uri;
          state: { remotes: { name: string; fetchUrl?: string }[] };
        }[];
      };
    }>("vscode.git");
    assert.ok(git, "the built-in git extension is missing");
    const api = (await git.activate()).getAPI(1);
    if (api.state !== "initialized") {
      await new Promise<void>((resolve) => api.onDidChangeState(() => resolve()));
    }
    const deadline = Date.now() + 10_000;
    while (api.repositories.length < 3 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const remotes = Object.fromEntries(
      api.repositories.map((r) => [
        r.rootUri.path.split("/").at(-1),
        r.state.remotes.map((remote) => `${remote.name} ${remote.fetchUrl}`),
      ]),
    );
    assert.deepEqual(remotes, {
      "origin-repo": ["origin https://github.com/test-owner/origin-repo.git"],
      "upstream-only": ["upstream git@github.com:test-owner/upstream-only.git"],
      "no-remote": [],
    });
  });
});
