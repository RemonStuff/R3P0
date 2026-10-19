import type { RepoInfo, RepoRemote } from "../../src/core/types";
import type { RepoDiscoveryPort } from "../../src/ports/RepoDiscoveryPort";
import { Emitter } from "./emitter";

/** A RepoInfo for a folder under D:\Repos, keyed by its folder URI. */
export function repo(folderName: string, remotes: readonly RepoRemote[] = []): RepoInfo {
  const folderUri = `file:///d%3A/Repos/${encodeURIComponent(folderName)}`;
  return { key: folderUri, folderName, folderUri, remotes };
}

/** Workspace folders the test controls: `set` changes them, `emit` announces it. */
export class FakeRepoDiscovery implements RepoDiscoveryPort {
  private readonly changes = new Emitter<readonly RepoInfo[]>();
  readonly onDidChange = this.changes.event;

  constructor(private repos: readonly RepoInfo[] = []) {}

  async current(): Promise<readonly RepoInfo[]> {
    return [...this.repos];
  }

  set(repos: readonly RepoInfo[]): void {
    this.repos = repos;
  }

  emit(): void {
    this.changes.fire([...this.repos]);
  }
}
