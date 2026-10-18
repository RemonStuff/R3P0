// Runs the half-covered fixture with the project's real coverage thresholds,
// so test/unit/tooling/vitest-setup.test.ts can prove the gate fails.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { coreThresholds, unitTest } from "../../../vitest.config";

const fixture = "test/fixtures/coverage-gate/half.ts";

export default defineConfig({
  test: {
    ...unitTest,
    root: fileURLToPath(new URL("../../..", import.meta.url)),
    include: ["test/fixtures/coverage-gate/*.test.ts"],
    coverage: {
      ...unitTest.coverage,
      include: [fixture],
      thresholds: { [fixture]: coreThresholds },
      reportsDirectory: "coverage/coverage-gate",
    },
  },
});
