export type AgentProfile =
  | 'gentle-orchestrator'
  | 'phase-init'
  | 'phase-explore'
  | 'phase-propose'
  | 'phase-spec'
  | 'phase-design'
  | 'phase-tasks'
  | 'phase-apply'
  | 'phase-verify'
  | 'phase-archive'
  | 'phase-onboard'
  | 'consensus-judge-a'
  | 'consensus-judge-b'
  | 'consensus-fixer';

export interface ModelRequirements {
  minContextWindow: number;
  requiredCapabilities: string[];
  priorityMetric: 'reasoning' | 'coding' | 'speed';
}

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

export interface ModelMarketItem {
  name: string;
  sizeGb: number;
  contextWindow: number;
  capabilities: string[];
  metrics: {
    reasoning: number;
    coding: number;
    speed: number;
  };
}

export interface SelectModelOptions {
  agentProfile: AgentProfile;
  catalogo: ModelMarketItem[];
  availableVramGb: number;
}

/**
 * Selecciona el modelo óptimo para una fase del ciclo basándose en 
 * restricciones físicas de hardware y prioridades cognitivas del rol.
 */
export function selectBestModelForAgent(options: SelectModelOptions): ModelMarketItem {
  const { agentProfile, catalogo, availableVramGb } = options;
  const reqs = AGENT_REQUIREMENTS_MAP[agentProfile];

  const modelosValidos = catalogo.filter((model) => {
    if (model.sizeGb > availableVramGb) return false;
    if (model.contextWindow < reqs.minContextWindow) return false;
    
    return reqs.requiredCapabilities.every((cap) =>
      model.capabilities.includes(cap)
    );
  });

  if (modelosValidos.length === 0) {
    throw new Error(`Ningún modelo del catálogo satisface los requisitos de: ${agentProfile}`);
  }

  return modelosValidos.sort((a, b) => b.metrics[reqs.priorityMetric] - a.metrics[reqs.priorityMetric])[0];
}