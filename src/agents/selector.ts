// src/agents/selector.ts
import { ModelDescriptor } from '../compatibility/types.js';
import { AgentProfile, ModelRequirements, CognitiveModelItem, SelectModelOptions } from './types.js';

export const AGENT_REQUIREMENTS_MAP: Record<AgentProfile, ModelRequirements> = {
  'agentic-orchestrator': { minContextWindow: 8192, requiredCapabilities: ['tool-calling', 'reasoning'], priorityMetric: 'reasoning' },
  'phase-init': { minContextWindow: 4096, requiredCapabilities: [], priorityMetric: 'speed' },
  'phase-explore': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], priorityMetric: 'reasoning' },
  'phase-propose': { minContextWindow: 8192, requiredCapabilities: ['reasoning'], priorityMetric: 'reasoning' },
  'phase-spec': { minContextWindow: 8192, requiredCapabilities: ['json-mode'], priorityMetric: 'reasoning' },
  'phase-design': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], priorityMetric: 'coding' },
  'phase-tasks': { minContextWindow: 8192, requiredCapabilities: ['json-mode', 'tool-calling'], priorityMetric: 'reasoning' },
  'phase-apply': { minContextWindow: 16384, requiredCapabilities: ['tool-calling'], priorityMetric: 'coding' },
  'phase-verify': { minContextWindow: 16384, requiredCapabilities: ['json-mode'], priorityMetric: 'coding' },
  'phase-archive': { minContextWindow: 4096, requiredCapabilities: [], priorityMetric: 'speed' },
  'phase-onboard': { minContextWindow: 8192, requiredCapabilities: [], priorityMetric: 'speed' },
  'consensus-judge-a': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], priorityMetric: 'reasoning' },
  'consensus-judge-b': { minContextWindow: 16384, requiredCapabilities: ['reasoning'], priorityMetric: 'reasoning' },
  'consensus-fixer': { minContextWindow: 16384, requiredCapabilities: ['tool-calling'], priorityMetric: 'coding' }
};

export const COGNITIVE_METRICS_MAP: Record<string, Omit<CognitiveModelItem, 'name' | 'sizeGb' | 'description'>> = {
  'phi3:mini': {
    contextWindow: 128000,
    capabilities: [],
    metrics: { reasoning: 70, coding: 60, speed: 90 }
  },
  'llama3:8b': {
    contextWindow: 8192,
    capabilities: ['json-mode', 'tool-calling'],
    metrics: { reasoning: 80, coding: 75, speed: 75 }
  },
  'gemma2:9b': {
    contextWindow: 8192,
    capabilities: ['reasoning'],
    metrics: { reasoning: 85, coding: 78, speed: 70 }
  },
  'mistral:7b': {
    contextWindow: 32768,
    capabilities: ['tool-calling'],
    metrics: { reasoning: 75, coding: 70, speed: 80 }
  },
  'qwen2.5:7b': {
    contextWindow: 32768,
    capabilities: ['json-mode', 'tool-calling'],
    metrics: { reasoning: 82, coding: 88, speed: 78 }
  },
  'deepseek-coder:6.7b': {
    contextWindow: 16384,
    capabilities: ['tool-calling'],
    metrics: { reasoning: 75, coding: 92, speed: 80 }
  },
  'llama3.1:70b': {
    contextWindow: 128000,
    capabilities: ['json-mode', 'tool-calling', 'reasoning'],
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
    capabilities: [],
    metrics: { reasoning: 50, coding: 50, speed: 50 }
  };

  return {
    ...model,
    ...metadata
  };
}

/**
 * Selects the optimal model for an agent profile based on hardware limitations
 * and specific cognitive capabilities required by its role.
 */
export function selectBestModelForAgent(options: SelectModelOptions): CognitiveModelItem {
  const { agentProfile, catalogo, availableVramGb } = options;
  const reqs = AGENT_REQUIREMENTS_MAP[agentProfile];

  const validModels = catalogo.filter((model) => {
    if (model.sizeGb > availableVramGb) return false;
    if (model.contextWindow < reqs.minContextWindow) return false;
    
    return reqs.requiredCapabilities.every((cap) =>
      model.capabilities.includes(cap)
    );
  });

  if (validModels.length === 0) {
    throw new Error(`Ningún modelo del catálogo satisface los requisitos de: ${agentProfile}`);
  }

  return validModels.sort((a, b) => b.metrics[reqs.priorityMetric] - a.metrics[reqs.priorityMetric])[0];
}

