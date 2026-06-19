// src/agents/scoring/extractor.ts
import { ModelDescriptor } from '../../compatibility/types.js';
import { HFModelMetadata, EnrichedModel } from '../../registry/hf/types.js';
import { CanonicalResult } from '../../registry/hf/normalizer.js';

export function extractFeatures(
  llmfitModel: ModelDescriptor,
  canonical: CanonicalResult,
  hfMetadata: HFModelMetadata | null
): EnrichedModel {
  
  // 1. Safe extraction of arrays
  const tags = hfMetadata?.tags || [];
  const pipeline_tag = hfMetadata?.pipeline_tag || '';
  const use_case = (llmfitModel.use_case || llmfitModel.use || '').toLowerCase();
  
  const score_components = (llmfitModel as any).score_components || {};

  // 2. Capabilities Extraction
  const tool_use = tags.includes('tool_use') || tags.includes('function_calling');
  const vision = pipeline_tag.includes('vision') || pipeline_tag.includes('multimodal');
  const coding = use_case.includes('coding') || tags.includes('code');
  
  // reasoning_proxy calculation
  let reasoning_proxy = typeof score_components.quality === 'number' ? score_components.quality : (llmfitModel.score || 50);
  
  // Bonus if MoE (better reasoning/param ratio usually)
  const is_moe = !!llmfitModel.is_moe;
  if (is_moe) {
    reasoning_proxy += 5; // +5 points bonus
  }

  // Bonus for large models
  const paramsB = typeof llmfitModel.params_b === 'number' ? llmfitModel.params_b : 0;
  if (paramsB >= 30) {
    reasoning_proxy += 8;
  } else if (paramsB >= 14) {
    reasoning_proxy += 4;
  }

  return {
    id: canonical.canonicalId,
    originalName: llmfitModel.name,
    
    // llmfit
    tps: typeof llmfitModel.estimated_tps === 'number' ? llmfitModel.estimated_tps : 0,
    fit: llmfitModel.fit_level || 'Unknown',
    memory_required_gb: typeof llmfitModel.memory_required_gb === 'number' ? llmfitModel.memory_required_gb : (llmfitModel.sizeGb || 0),
    context_length: llmfitModel.context_length || llmfitModel.contextWindow || 4096,
    score_components,

    // HF
    tags,
    pipeline_tag,
    base_model: canonical.baseModelName,
    downloads: hfMetadata?.downloads || 0,
    likes: hfMetadata?.likes || 0,
    lastModified: hfMetadata?.lastModified || '',
    license: hfMetadata?.license || '',
    architectures: tags.filter(t => t.endsWith('ForCausalLM')),

    capabilities: {
      tool_use,
      vision,
      coding,
      reasoning_proxy
    },

    runtime: {
      is_moe,
      quantization: canonical.quantization || llmfitModel.quant || undefined
    }
  };
}
