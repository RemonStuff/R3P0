import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "./support";

function sources(dir: string, extension: RegExp): string[] {
  return readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
    .filter((file) => extension.test(file) && !file.includes("dist"))
    .map((file) => join(root, dir, file));
}

const integration = () => sources("test/integration", /\.ts$/);
const fixtures = () => sources("test/fixtures", /\.(ts|js|mjs|json)$/);

describe("integration test guard", () => {
  it("integration tests exist for each config", () => {
    const tests = integration().map((f) => f.replaceAll("\\", "/"));
    for (const config of ["with-q0t4", "without-q0t4", "q0t4-api-v2"]) {
      expect(tests.some((f) => f.includes(`/${config}/`) && f.endsWith(".test.ts"))).toBe(true);
    }
  });

  it('no integration test or fixture uses vendor: "copilot"', () => {
    const offenders = [...integration(), ...fixtures()].filter((file) =>
      /vendor\s*["']?\s*:\s*["'`]copilot["'`]/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("the only RemonStuff.q0t4 the tests load is the fake fixture", () => {
    const config = readFileSync(join(root, ".vscode-test.mjs"), "utf8");
    expect(config).not.toMatch(/installExtensions/);
    const manifest = JSON.parse(
      readFileSync(join(root, "test/fixtures/fake-q0t4/package.json"), "utf8"),
    ) as { publisher: string; name: string; description: string };
    expect(`${manifest.publisher}.${manifest.name}`).toBe("RemonStuff.q0t4");
    expect(manifest.description).toMatch(/test-only/i);
  });
});
