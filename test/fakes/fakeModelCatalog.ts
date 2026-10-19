import type { ModelInfo } from "../../src/core/types";
import type { ModelCatalogPort } from "../../src/ports/ModelCatalogPort";
import { Emitter } from "./emitter";

/** A ModelInfo whose id and family are the slug of its display name. */
export function modelInfo(name: string, vendor = "r3p0-test"): ModelInfo {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return { vendor, id: slug, name, family: slug, maxInputTokens: 128_000 };
}

export class FakeModelCatalog implements ModelCatalogPort {
  private readonly changes = new Emitter<void>();
  readonly onDidChange = this.changes.event;

  constructor(private models: readonly ModelInfo[] = []) {}

  async list(): Promise<readonly ModelInfo[]> {
    return [...this.models];
  }

  /** Replaces the models and fires onDidChange, like lm.onDidChangeChatModels. */
  replace(models: readonly ModelInfo[]): void {
    this.models = models;
    this.changes.fire();
  }
}
