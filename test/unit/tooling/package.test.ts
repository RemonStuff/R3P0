import { beforeAll, describe, expect, it } from "vitest";
import { runCli, runNode } from "./support";

describe("installable extension package", () => {
  let files: string[];

  beforeAll(() => {
    const build = runNode(["esbuild.mjs", "--production"]);
    expect(build.status, build.output).toBe(0);
    const listing = runCli("@vscode/vsce/vsce", ["ls", "--no-dependencies"]);
    expect(listing.status, listing.output).toBe(0);
    files = listing.output.trim().split(/\r?\n/);
  });

  it("contains both bundles and the activity-bar icon", () => {
    expect(files).toEqual(
      expect.arrayContaining(["dist/extension.js", "dist/webview.js", "media/r3p0.svg"]),
    );
  });

  it("contains no sources, tests, build tooling or source maps", () => {
    expect(
      files.filter((file) => /^(?:src|test|out|node_modules|\.vscode-test)\//.test(file)),
    ).toEqual([]);
    expect(files.filter((file) => /\.(?:ts|mjs|map)$/.test(file))).toEqual([]);
  });
});
