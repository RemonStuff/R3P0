// Guards for the project's architectural rules. These run with node:test
// until Vitest arrives in #2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(import.meta.url);

async function lint(code, filePath) {
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages;
}

const valueImport = 'import * as vscode from "vscode";\n\nexport const api = vscode;\n';
const typeImport = 'import type { Uri } from "vscode";\n\nexport type Target = Uri;\n';
const adapterImport =
  'import { channel } from "../adapters/webviewViewChannel";\n\nexport const c = channel;\n';
const extensionImport = 'import { activate } from "../extension";\n\nexport const a = activate;\n';

function restrictedImports(messages) {
  return messages.filter((m) => m.ruleId === "no-restricted-imports");
}

test("lint fails when a file in src/core imports vscode", async () => {
  const messages = await lint(valueImport, "src/core/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint fails when a file in src/core type-imports vscode", async () => {
  const messages = await lint(typeImport, "src/core/nested/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint fails when a file in src/ports imports vscode", async () => {
  const messages = await lint(typeImport, "src/ports/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint fails when a file in src/webview imports vscode", async () => {
  const messages = await lint(valueImport, "src/webview/view/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint fails when a file in src/webview imports from src/adapters", async () => {
  const messages = await lint(adapterImport, "src/webview/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint fails when a file in src/webview imports src/extension", async () => {
  const messages = await lint(extensionImport, "src/webview/fixture.ts");
  assert.equal(restrictedImports(messages).length, 1, JSON.stringify(messages));
});

test("lint passes when a file in src/webview imports from src/core", async () => {
  const code = 'import { reduce } from "../core/ui/reducer";\n\nexport const r = reduce;\n';
  assert.deepEqual(restrictedImports(await lint(code, "src/webview/fixture.ts")), []);
});

test("lint passes when a file in src/adapters imports vscode", async () => {
  const messages = await lint(valueImport, "src/adapters/fixture.ts");
  assert.deepEqual(messages, []);
});

test("typecheck rejects implicit any", () => {
  const tsc = require.resolve("typescript/bin/tsc");
  const result = spawnSync(process.execPath, [tsc, "--noEmit", "-p", "test/lint-fixtures"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  // TS5xxx means the project config itself failed to load, which would make
  // the TS7006 below come from compiler defaults rather than our tsconfig.
  assert.doesNotMatch(result.stdout, /error TS5\d{3}/);
  assert.match(result.stdout, /error TS7006/);
});

test("build emits dist/extension.js (cjs, node) and dist/webview.js (iife, browser)", () => {
  const dist = join(root, "dist");
  rmSync(dist, { recursive: true, force: true });
  const result = spawnSync(process.execPath, ["esbuild.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  const extension = readFileSync(join(dist, "extension.js"), "utf8");
  assert.match(extension, /module\.exports/);

  assert.ok(existsSync(join(dist, "webview.js")), "dist/webview.js was not emitted");
  const webview = readFileSync(join(dist, "webview.js"), "utf8");
  assert.doesNotMatch(webview, /module\.exports|require\(/);
});
