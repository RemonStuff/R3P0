import { defineConfig } from "@vscode/test-cli";

// Shared by every config. Pinned to Q0T4's test version so runs are reproducible.
const common = {
  version: "1.142.0",
  workspaceFolder: ".vscode-test/workspace/r3p0.code-workspace",
  mocha: { ui: "bdd", timeout: 20_000 },
};

const fakeQ0T4 = "test/fixtures/fake-q0t4";
const fakeProvider = "test/fixtures/fake-lm-provider";

// The "RemonStuff.q0t4" in these instances is always the fake fixture, never the
// real Q0T4, and no extension is installed from the Marketplace.
export default defineConfig([
  {
    ...common,
    label: "with-q0t4",
    files: "out/test/integration/with-q0t4/**/*.test.js",
    extensionDevelopmentPath: [".", fakeQ0T4, fakeProvider],
  },
  {
    ...common,
    label: "without-q0t4",
    files: "out/test/integration/without-q0t4/**/*.test.js",
    extensionDevelopmentPath: [".", fakeProvider],
  },
  {
    ...common,
    label: "q0t4-api-v2",
    files: "out/test/integration/q0t4-api-v2/**/*.test.js",
    extensionDevelopmentPath: [".", fakeQ0T4, fakeProvider],
    env: { FAKE_Q0T4_API_VERSION: "2" },
  },
]);
