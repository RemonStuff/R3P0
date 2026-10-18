import type { ModelInfo } from "../core/types";
import type { Disposable } from "./Disposable";

/**
 * The chat models available in VS Code, as metadata only. Implemented by
 * `adapters/lmModelCatalog` over `vscode.lm.selectChatModels()` (#24).
 */
export interface ModelCatalogPort {
  list(): Promise<readonly ModelInfo[]>;
  onDidChange(listener: () => void): Disposable;
}
