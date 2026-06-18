// src/compatibility/engine.ts
import { HardwareProfile } from '../hardware/index.js';
import { CompatibilityRule, CompatibilityResult, ModelDescriptor } from './types.js';

export class CompatibilityEngine {
  private rules: CompatibilityRule[];

  constructor(rules: CompatibilityRule[]) {
    this.rules = rules;
  }

  /**
   * Evaluates a model against all registered rules for a given hardware profile.
   */
  checkCompatibility(model: ModelDescriptor, profile: HardwareProfile): CompatibilityResult {
    for (const rule of this.rules) {
      const result = rule.evaluate(model, profile);
      if (!result.compatible) {
        return result;
      }
    }
    return { compatible: true };
  }

  /**
   * Filters a list of models, returning only those that are compatible.
   */
  filterCompatible(models: ModelDescriptor[], profile: HardwareProfile): ModelDescriptor[] {
    return models.filter(model => this.checkCompatibility(model, profile).compatible);
  }
}
