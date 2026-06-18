// src/agents/selector.ts
import { ModelDescriptor } from '../compatibility/types.js';
import type { AgentProfile, ModelRequirements, CognitiveModelItem, SelectModelOptions, Capability, OutputFormat } from './types.js';

export const AGENT_REQUIREMENTS_MAP: Record<AgentProfile, ModelRequirements> = {
  'agentic-orchestrator': { minContextWindow: 8192, requiredCapabilities: ['tool-calling', 'reasoning'], outputFormats: ['json', 'text'], priorityMetric: 'reasoning' },
  'phase-init': { minContextWindow: 4096, requiredCapabilities: [], outputFormats: ['text'], priorityMetric: 'speed' },
  'phase-explore': { minContextWindow: 65536, requiredCapabilities: ['reasoning'], outputFormats: ['markdown', 'code'], priorityMetric: 'reasoning' },
  'phase-propose': { minContextWindow: 8192, requiredCapabilities: ['reasoning'], outputFormats: ['markdown'], priorityMetric: 'reasoning' },
  'phase-spec': { minContextWindow: 8192, requiredCapabilities: ['json-mode', 'reasoning'], outputFormats: ['json'], priorityMetric: 'reasoning' },
  'phase-design': { minContextWindow: 16384, requiredCapabilities: ['reasoning', 'coding'], outputFormats: ['markdown', 'code'], priorityMetric: 'coding' },
  'phase-tasks': { minContextWindow: 8192, requiredCapabilities: ['json-mode', 'tool-calling'], outputFormats: ['json'], priorityMetric: 'reasoning' },
  'phase-apply': { minContextWindow: 16384, requiredCapabilities: ['tool-calling', 'coding'], outputFormats: ['code'], priorityMetric: 'coding' },
  'phase-verify': { minContextWindow: 16384, requiredCapabilities: ['json-mode', 'reasoning'], outputFormats: ['json', 'code'], priorityMetric: 'coding' },
  'phase-archive': { minContextWindow: 4096, requiredCapabilities: [], outputFormats: ['markdown', 'text'], priorityMetric: 'speed' },
  'phase-onboard': { minContextWindow: 8192, requiredCapabilities: [], outputFormats: ['markdown', 'text'], priorityMetric: 'speed' },
  'consensus-judge-a': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], outputFormats: ['markdown', 'json'], priorityMetric: 'reasoning' },
  'consensus-judge-b': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], outputFormats: ['markdown', 'json'], priorityMetric: 'reasoning' },
  'consensus-fixer': { minContextWindow: 16384, requiredCapabilities: ['tool-calling', 'coding'], outputFormats: ['code'], priorityMetric: 'coding' }
};

export const COGNITIVE_METRICS_MAP: Record<string, Omit<CognitiveModelItem, 'name' | 'sizeGb' | 'description'>> = {
  'phi3:mini': {
    contextWindow: 128000,
    capabilities: [],
    supportedOutputFormats: ['text', 'markdown'],
    metrics: { reasoning: 70, coding: 60, speed: 90 }
  },
  'llama3:8b': {
    contextWindow: 8192,
    capabilities: ['json-mode', 'tool-calling'],
    supportedOutputFormats: ['json', 'text', 'markdown', 'code'],
    metrics: { reasoning: 80, coding: 75, speed: 75 }
  },
  'gemma2:9b': {
    contextWindow: 8192,
    capabilities: ['reasoning'],
    supportedOutputFormats: ['text', 'markdown', 'code'],
    metrics: { reasoning: 85, coding: 78, speed: 70 }
  },
  'mistral:7b': {
    contextWindow: 32768,
    capabilities: ['tool-calling'],
    supportedOutputFormats: ['text', 'markdown', 'code', 'json'],
    metrics: { reasoning: 75, coding: 70, speed: 80 }
  },
  'qwen2.5:7b': {
    contextWindow: 32768,
    capabilities: ['json-mode', 'tool-calling', 'coding'],
    supportedOutputFormats: ['json', 'code', 'markdown', 'text'],
    metrics: { reasoning: 82, coding: 88, speed: 78 }
  },
  'deepseek-coder:6.7b': {
    contextWindow: 16384,
    capabilities: ['tool-calling', 'coding'],
    supportedOutputFormats: ['code', 'text', 'markdown'],
    metrics: { reasoning: 75, coding: 92, speed: 80 }
  },
  'llama3.1:70b': {
    contextWindow: 128000,
    capabilities: ['json-mode', 'tool-calling', 'reasoning', 'coding'],
    supportedOutputFormats: ['json', 'code', 'markdown', 'text'],
    metrics: { reasoning: 92, coding: 90, speed: 40 }
  }
};

/**
 * Enriches a plain ModelDescriptor with cognitive capabilities from the global map.
 */
export function enrichModelDescriptor(model: ModelDescriptor): CognitiveModelItem {
  const normalized = model.name.toLowerCase().trim();
  const foundKey = Object.keys(COGNITIVE_METRICS_MAP).find(key => normalized.includes(key));

  const metadata = foundKey ? COGNITIVE_METRICS_MAP[foundKey] : {
    contextWindow: 4096,
    capabilities: [] as Capability[],
    supportedOutputFormats: ['text'] as OutputFormat[],
    metrics: { reasoning: 50, coding: 50, speed: 50 }
  };

  return {
    ...model,
    ...metadata
  };
}

/**
 * Selects the optimal model for an agent profile based on hardware limitations,
 * cognitive capabilities, and output format requirements.
 */
export function selectBestModelForAgent(options: SelectModelOptions): CognitiveModelItem {
  const { agentProfile, catalogo, availableVramGb } = options;
  const reqs = AGENT_REQUIREMENTS_MAP[agentProfile];

  const validModels = catalogo.filter((model) => {
    if (model.sizeGb > availableVramGb) return false;
    if (model.contextWindow < reqs.minContextWindow) return false;

    const hasCapabilities = reqs.requiredCapabilities.every((cap) =>
      model.capabilities.includes(cap)
    );
    if (!hasCapabilities) return false;

    // Output format matching — strict filter when the agent requires specific formats
    if (reqs.outputFormats.length > 0) {
      const hasFormats = reqs.outputFormats.every((fmt) =>
        model.supportedOutputFormats.includes(fmt)
      );
      if (!hasFormats) return false;
    }

    return true;
  });

  if (validModels.length === 0) {
    throw new Error(`No model in the catalog satisfies the requirements for: ${agentProfile}`);
  }

  return validModels.sort((a, b) => b.metrics[reqs.priorityMetric] - a.metrics[reqs.priorityMetric])[0];
}
