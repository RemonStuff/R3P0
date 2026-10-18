import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import type { ViteUserConfig } from "vitest/config";

type TestOptions = NonNullable<ViteUserConfig["test"]>;

// Exported so test/fixtures/coverage-gate can prove these exact thresholds fail.
export const coreThresholds = { lines: 90, branches: 90 };

const unitInclude = [
  "test/unit/**/*.test.ts",
  "test/fakes/**/*.test.ts",
  "test/contract/**/*.test.ts",
];
const domInclude = ["test/webview/**/*.test.ts"];

export const unitTest = {
  include: unitInclude,
  alias: {
    vscode: fileURLToPath(new URL("./test/unit/no-vscode.ts", import.meta.url)),
  },
  coverage: {
    provider: "v8",
    // Webview coverage is reported; only core is gated (docs/PLAN.md §8.5).
    include: ["src/core/**/*.ts", "src/webview/**/*.ts"],
    reporter: ["text", "html", "lcov"],
    thresholds: { "src/core/**/*.ts": coreThresholds },
  },
} satisfies TestOptions;

// Projects inherit alias and coverage from the root (extends: true), but list
// their own files: inherited `include` arrays would be merged, not replaced.
const shared = { alias: unitTest.alias, coverage: unitTest.coverage };

export default defineConfig({
  test: {
    ...shared,
    projects: [
      { extends: true, test: { name: "unit", environment: "node", include: unitInclude } },
      { extends: true, test: { name: "dom", environment: "happy-dom", include: domInclude } },
    ],
  },
});
