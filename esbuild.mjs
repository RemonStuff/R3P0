import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");

const shared = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: "info",
};

const contexts = await Promise.all([
  // Extension host (Node).
  esbuild.context({
    ...shared,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    format: "cjs",
    platform: "node",
    target: "node22",
    external: ["vscode"],
  }),
  // Webview (browser); loaded by the view under a nonce-based CSP.
  esbuild.context({
    ...shared,
    entryPoints: ["src/webview/main.ts"],
    outfile: "dist/webview.js",
    format: "iife",
    platform: "browser",
    target: "es2022",
  }),
]);

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
} else {
  await Promise.all(contexts.map((c) => c.rebuild()));
  await Promise.all(contexts.map((c) => c.dispose()));
}
