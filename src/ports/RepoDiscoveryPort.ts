import type { RepoInfo } from "../core/types";
import type { Disposable } from "./Disposable";

/**
 * The workspace folders and their git remotes. Implemented by
 * `adapters/workspaceRepos` over the workspace and the built-in git API (#17).
 */
export interface RepoDiscoveryPort {
  /** One entry per workspace folder, in folder order. */
  current(): Promise<readonly RepoInfo[]>;
  /** Fires with the full list after folders or remotes change. */
  onDidChange(listener: (repos: readonly RepoInfo[]) => void): Disposable;
}
