import { describe, expect, it } from "vitest";
import { coreThresholds, unitTest } from "../../../vitest.config";
import { vitestCli } from "./support";

describe("vitest setup", () => {
  it("vitest discovers tests under test/unit and test/webview and skips fixture tests", () => {
    const { status, output } = vitestCli(["list", "--filesOnly"]);
    const files = output.replaceAll("\\", "/");
    expect(status, output).toBe(0);
    expect(files).toContain("test/unit/tooling/vitest-setup.test.ts");
    expect(files).toContain("test/webview/environment.test.ts");
    expect(files).not.toContain("test/fixtures/");
  }, 60_000);

  it("vitest also discovers tests for the fakes and the contract suites", () => {
    expect(unitTest.include).toContain("test/fakes/**/*.test.ts");
    expect(unitTest.include).toContain("test/contract/**/*.test.ts");
  });

  it("coverage is gated at 90% lines and branches on src/core only", () => {
    expect(coreThresholds).toEqual({ lines: 90, branches: 90 });
    expect(unitTest.coverage.thresholds).toEqual({ "src/core/**/*.ts": coreThresholds });
  });

  it("webview coverage is reported but not gated", () => {
    expect(unitTest.coverage.include).toContain("src/webview/**/*.ts");
  });

  it("coverage run fails when core branch coverage is below 90%", () => {
    const { status, output } = vitestCli([
      "run",
      "--coverage",
      "--config",
      "test/fixtures/coverage-gate/vitest.config.ts",
    ]);
    expect(status).not.toBe(0);
    expect(output).toMatch(
      /Coverage for branches \(\d+(\.\d+)?%\) does not meet .*threshold \(90%\)/,
    );
  }, 60_000);

  it("importing vscode from a core test fails fast", async () => {
    await expect(import("vscode")).rejects.toThrow(/must not import vscode/);
  });

  it("node unit tests have no DOM: document is undefined", () => {
    expect("document" in globalThis).toBe(false);
  });
});
