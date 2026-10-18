import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { root, runCli, runNode } from "./support";

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages ?? [];
}

function restrictedImports(messages: ESLint.LintResult["messages"]) {
  return messages.filter((m) => m.ruleId === "no-restricted-imports");
}

const valueImport = 'import * as vscode from "vscode";\n\nexport const api = vscode;\n';
const typeImport = 'import type { Uri } from "vscode";\n\nexport type Target = Uri;\n';
const adapterImport =
  'import { channel } from "../adapters/webviewViewChannel";\n\nexport const c = channel;\n';
const extensionImport = 'import { activate } from "../extension";\n\nexport const a = activate;\n';
const coreImport = 'import { reduce } from "../core/ui/reducer";\n\nexport const r = reduce;\n';

describe("ports-and-adapters boundary", () => {
  it("lint fails when a file in src/core imports vscode", async () => {
    expect(restrictedImports(await lint(valueImport, "src/core/fixture.ts"))).toHaveLength(1);
  });

  it("lint fails when a file in src/core type-imports vscode", async () => {
    expect(restrictedImports(await lint(typeImport, "src/core/nested/fixture.ts"))).toHaveLength(1);
  });

  it("lint fails when a file in src/ports imports vscode", async () => {
    expect(restrictedImports(await lint(typeImport, "src/ports/fixture.ts"))).toHaveLength(1);
  });

  it("lint fails when a file in src/webview imports vscode", async () => {
    expect(restrictedImports(await lint(valueImport, "src/webview/view/fixture.ts"))).toHaveLength(
      1,
    );
  });

  it("lint fails when a file in src/webview imports from src/adapters", async () => {
    expect(restrictedImports(await lint(adapterImport, "src/webview/fixture.ts"))).toHaveLength(1);
  });

  it("lint fails when a file in src/webview imports src/extension", async () => {
    expect(restrictedImports(await lint(extensionImport, "src/webview/fixture.ts"))).toHaveLength(
      1,
    );
  });

  it("lint passes when a file in src/webview imports from src/core", async () => {
    expect(restrictedImports(await lint(coreImport, "src/webview/fixture.ts"))).toEqual([]);
  });

  it("lint passes when a file in src/adapters imports vscode", async () => {
    expect(await lint(valueImport, "src/adapters/fixture.ts")).toEqual([]);
  });
});

describe("strict typecheck", () => {
  it("typecheck rejects implicit any", () => {
    const { status, output } = runCli("typescript/bin/tsc", [
      "--noEmit",
      "-p",
      "test/lint-fixtures",
    ]);
    expect(status).not.toBe(0);
    // TS5xxx means the project config itself failed to load, which would make
    // the TS7006 below come from compiler defaults rather than our tsconfig.
    expect(output).not.toMatch(/error TS5\d{3}/);
    expect(output).toMatch(/error TS7006/);
  }, 60_000);
});

describe("build", () => {
  it("build emits dist/extension.js (cjs, node) and dist/webview.js (iife, browser)", () => {
    const dist = join(root, "dist");
    rmSync(dist, { recursive: true, force: true });
    const { status, output } = runNode(["esbuild.mjs"]);
    expect(status, output).toBe(0);

    expect(readFileSync(join(dist, "extension.js"), "utf8")).toMatch(/module\.exports/);
    expect(existsSync(join(dist, "webview.js"))).toBe(true);
    expect(readFileSync(join(dist, "webview.js"), "utf8")).not.toMatch(/module\.exports|require\(/);
  }, 60_000);
});
