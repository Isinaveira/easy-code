// src/agents/selector.ts
import { AgentProfile, ModelRequirements, CognitiveModelItem, SelectModelOptions } from './types.js';

export const AGENT_REQUIREMENTS_MAP: Record<AgentProfile, ModelRequirements> = {
  'gentle-orchestrator': { minContextWindow: 8192, requiredCapabilities: ['tool-calling', 'reasoning'], priorityMetric: 'reasoning' },
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
