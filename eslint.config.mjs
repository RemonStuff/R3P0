import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Core, ports and the webview must never reach VS Code directly; only adapters
// may (docs/PLAN.md §3). Type-only imports count too.
const vscodePath = {
  name: "vscode",
  message:
    "Keep src/core, src/ports and src/webview free of vscode; reach VS Code through a port with an adapter in src/adapters.",
};

// The webview is a browser bundle: it may use core, never the extension host side.
const extensionHostPatterns = {
  group: ["**/adapters", "**/adapters/**", "**/extension", "**/extension.ts"],
  message:
    "The webview runs in a browser; it may import src/core but not src/adapters or src/extension.",
};

export default defineConfig(
  {
    ignores: ["**/dist/", "out/", "coverage/", ".vscode-test/", "test/lint-fixtures/"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // Test-only fixture extensions in plain JS are CommonJS, loaded by VS Code as-is.
    files: ["test/fixtures/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/core/**/*.ts", "src/ports/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { paths: [vscodePath] }] },
  },
  {
    files: ["src/webview/**/*.ts"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [vscodePath], patterns: [extensionHostPatterns] },
      ],
    },
  },
);
