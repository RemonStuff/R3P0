// Bundles the TypeScript fixture extensions for the integration tests.
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["test/fixtures/fake-q0t4/extension.ts"],
  outfile: "test/fixtures/fake-q0t4/dist/extension.js",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "warning",
});
