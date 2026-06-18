// src/compatibility/types.ts
import { HardwareProfile } from '../hardware/index.js';
import type { Capability, OutputFormat } from '../agents/types.js';

export interface ModelDescriptor {
  name: string;
  sizeGb: number;
  description?: string;
  contextWindow?: number;
  capabilities?: Capability[];
  supportedOutputFormats?: OutputFormat[];
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
