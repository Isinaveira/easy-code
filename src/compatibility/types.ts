// src/compatibility/types.ts
import { HardwareProfile } from '../hardware/index.js';

export interface ModelDescriptor {
  name: string;
  sizeGb: number;
  description?: string;
  contextWindow?: number;
  capabilities?: string[];
}

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
  estimatedVramNeededGb?: number;
}

export interface CompatibilityRule {
  name: string;
  evaluate(model: ModelDescriptor, profile: HardwareProfile): CompatibilityResult;
}
