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
  score_components?: {
    context?: number;
    quality?: number;
    speed?: number;
    fit?: number;
  };
  estimated_tps?: number;
  fit_level?: string;
  fit_label?: string;
  memory_required_gb?: number;
  // llmfit extended fields
  parameter_count?: string;
  params_b?: number;
  is_moe?: boolean;
  category?: string;
  provider?: string;
  license?: string | null;
  release_date?: string | null;
  best_quant?: string;
  context_length?: number;
  use_case?: string;
  total_memory_gb?: number;
  memory_available_gb?: number;
  utilization_pct?: number;
  moe_offloaded_gb?: number | null;
  supports_tp?: number[];
  run_mode?: string;
  run_mode_label?: string;
  runtime?: string;
  runtime_label?: string;
  notes?: string[];
  gguf_sources?: Array<{ provider?: string; repo?: string }>;
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
