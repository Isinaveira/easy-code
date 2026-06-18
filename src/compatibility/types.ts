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
  score?: number;
  use?: string;
  quant?: string;
  params?: string;
  score_components?: any;
  estimated_tps?: number;
  fit_level?: string;
  memory_required_gb?: number;
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
