import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { Q0T4_ID } from "../support";

describe("integration harness (fake Q0T4 with API version 2)", () => {
  it("the fake Q0T4 reports apiVersion 2", async () => {
    const extension = vscode.extensions.getExtension<{ apiVersion: unknown }>(Q0T4_ID);
    assert.ok(extension);
    assert.equal((await extension.activate()).apiVersion, 2);
  });
});
