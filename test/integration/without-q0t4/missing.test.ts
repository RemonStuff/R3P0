import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { Q0T4_ID, R3P0_ID } from "../support";

describe("integration harness (without Q0T4)", () => {
  it("R3P0 extension is present in the test instance", () => {
    assert.ok(vscode.extensions.getExtension(R3P0_ID));
  });

  it("getExtension(RemonStuff.q0t4) is undefined", () => {
    assert.equal(vscode.extensions.getExtension(Q0T4_ID), undefined);
  });
});
