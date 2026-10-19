import { describe, expect, it } from "vitest";
import { FakeUi } from "./fakeUi";

describe("FakeUi", () => {
  it("records status bar states, opened extensions, copied text and external links", async () => {
    const ui = new FakeUi();
    ui.setStatusBar({ text: "R3P0 ⚠ 1", tooltip: "Q0T4: 140k / 150k", level: "warning" });
    await ui.openExtension("RemonStuff.q0t4");
    await ui.openSettings("@ext:RemonStuff.q0t4");
    await ui.copy("const x = 1;");
    await ui.openExternal("https://github.com/RemonStuff/R3P0");
    ui.showError("Something failed");

    expect(ui.statusBar).toEqual([
      { text: "R3P0 ⚠ 1", tooltip: "Q0T4: 140k / 150k", level: "warning" },
    ]);
    expect(ui.openedExtensions).toEqual(["RemonStuff.q0t4"]);
    expect(ui.openedSettings).toEqual(["@ext:RemonStuff.q0t4"]);
    expect(ui.copied).toEqual(["const x = 1;"]);
    expect(ui.openedLinks).toEqual(["https://github.com/RemonStuff/R3P0"]);
    expect(ui.errors).toEqual(["Something failed"]);
  });

  it("lastStatusBar is the most recent state", () => {
    const ui = new FakeUi();
    expect(ui.lastStatusBar).toBeUndefined();
    ui.setStatusBar({ text: "a", tooltip: "", level: "normal" });
    ui.setStatusBar({ text: "b", tooltip: "", level: "error" });
    expect(ui.lastStatusBar?.text).toBe("b");
  });
});
