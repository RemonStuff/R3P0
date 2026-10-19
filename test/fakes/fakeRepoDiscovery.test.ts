import { describe, expect, it } from "vitest";
import type { RepoInfo } from "../../src/core/types";
import { FakeRepoDiscovery, repo } from "./fakeRepoDiscovery";

const q0t4 = repo("Q0T4", [{ name: "origin", url: "https://github.com/RemonStuff/Q0T4.git" }]);
const r3p0 = repo("R3P0");

describe("FakeRepoDiscovery", () => {
  it("current returns the configured repos in folder order", async () => {
    const discovery = new FakeRepoDiscovery([q0t4, r3p0]);
    expect(await discovery.current()).toEqual([q0t4, r3p0]);
  });

  it("returns an empty list when configured with no folders", async () => {
    expect(await new FakeRepoDiscovery().current()).toEqual([]);
  });

  it("set + emit notifies onDidChange listeners with the new list", async () => {
    const discovery = new FakeRepoDiscovery([q0t4]);
    const seen: (readonly RepoInfo[])[] = [];
    discovery.onDidChange((repos) => seen.push(repos));

    discovery.set([q0t4, r3p0]);
    expect(seen).toEqual([]);
    discovery.emit();

    expect(seen).toEqual([[q0t4, r3p0]]);
    expect(await discovery.current()).toEqual([q0t4, r3p0]);
  });

  it("current returns copies, so callers can't change the configured list", async () => {
    const discovery = new FakeRepoDiscovery([q0t4]);
    const first = await discovery.current();
    (first as RepoInfo[]).pop();
    expect(await discovery.current()).toEqual([q0t4]);
  });

  it("repo() builds a RepoInfo with a Windows-style folder URI as its key", () => {
    expect(repo("Q0T4")).toEqual({
      key: "file:///d%3A/Repos/Q0T4",
      folderName: "Q0T4",
      folderUri: "file:///d%3A/Repos/Q0T4",
      remotes: [],
    });
  });
});
