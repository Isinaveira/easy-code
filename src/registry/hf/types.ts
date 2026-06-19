// src/registry/hf/types.ts
export interface HFModelMetadata {
  id: string;
  tags: string[];
  pipeline_tag?: string;
  downloads: number;
  likes: number;
  lastModified?: string;
  license?: string;
  author?: string;
}

export interface EnrichedModel {
  id: string; // The canonical repo id (e.g. Qwen/Qwen3.6-35B-A3B)
  originalName: string; // The raw name returned by llmfit

  // llmfit telemetry
  tps: number;
  fit: string;
  memory_required_gb: number;
  context_length: number;
  score_components: any;

  // HuggingFace semantics
  tags: string[];
  pipeline_tag: string;
  base_model?: string;
  downloads: number;
  likes: number;
  lastModified: string;
  license: string;
  architectures: string[];

  // derived via extractor
  capabilities: {
    tool_use: boolean;
    vision: boolean;
    coding: boolean;
    reasoning_proxy: number;
  };

  runtime: {
    is_moe: boolean;
    quantization?: string;
  };
}
