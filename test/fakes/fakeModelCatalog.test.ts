import { describe, expect, it } from "vitest";
import { FakeModelCatalog, modelInfo } from "./fakeModelCatalog";

describe("FakeModelCatalog", () => {
  it("lists the configured models", async () => {
    const mini = modelInfo("GPT-5 mini");
    expect(await new FakeModelCatalog([mini]).list()).toEqual([mini]);
  });

  it("lists nothing by default", async () => {
    expect(await new FakeModelCatalog().list()).toEqual([]);
  });

  it("fires onDidChange when the models are replaced", async () => {
    const catalog = new FakeModelCatalog([modelInfo("GPT-5 mini")]);
    let changes = 0;
    catalog.onDidChange(() => changes++);
    const sonnet = modelInfo("Claude Sonnet 5.5", "copilot");
    catalog.replace([sonnet]);
    expect(changes).toBe(1);
    expect(await catalog.list()).toEqual([sonnet]);
  });

  it("modelInfo() derives id and family from the display name", () => {
    expect(modelInfo("GPT-5 mini")).toEqual({
      vendor: "r3p0-test",
      id: "gpt-5-mini",
      name: "GPT-5 mini",
      family: "gpt-5-mini",
      maxInputTokens: 128_000,
    });
  });
});
