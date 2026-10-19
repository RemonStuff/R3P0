import { describe, expect, it } from "vitest";
import { InMemoryHistory } from "./inMemoryHistory";

describe("InMemoryHistory", () => {
  it("get returns undefined for a missing key", () => {
    expect(new InMemoryHistory().get("r3p0.history.v1:missing")).toBeUndefined();
  });

  it("set then get round-trips a value", async () => {
    const history = new InMemoryHistory();
    await history.set("k", { v: 1, turns: [] });
    expect(history.get("k")).toEqual({ v: 1, turns: [] });
  });

  it("get returns a deep copy, not the stored reference", async () => {
    const history = new InMemoryHistory();
    const value = { turns: [{ text: "hi" }] };
    await history.set("k", value);
    value.turns[0]!.text = "changed after set";
    const read = history.get("k") as typeof value;
    read.turns[0]!.text = "changed after get";
    expect(history.get("k")).toEqual({ turns: [{ text: "hi" }] });
  });

  it("keys lists stored keys", async () => {
    const history = new InMemoryHistory();
    await history.set("a", 1);
    await history.set("b", 2);
    expect([...history.keys()].sort()).toEqual(["a", "b"]);
  });

  it("set with undefined removes the key, like workspaceState.update", async () => {
    const history = new InMemoryHistory();
    await history.set("a", 1);
    await history.set("a", undefined);
    expect(history.keys()).toEqual([]);
  });

  it("set rejects when a write failure is injected, and keeps the old value", async () => {
    const history = new InMemoryHistory();
    await history.set("k", "old");
    history.failWrites(new Error("disk full"));
    await expect(history.set("k", "new")).rejects.toThrow("disk full");
    expect(history.get("k")).toBe("old");
    history.failWrites(undefined);
    await history.set("k", "new");
    expect(history.get("k")).toBe("new");
  });

  it("can be seeded with raw values, including corrupt ones", () => {
    const history = new InMemoryHistory({ "r3p0.history.v1:x": "not a conversation" });
    expect(history.get("r3p0.history.v1:x")).toBe("not a conversation");
  });
});
