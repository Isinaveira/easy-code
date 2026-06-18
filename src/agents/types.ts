// src/agents/types.ts
import { ModelDescriptor } from '../compatibility/types.js';

export type AgentProfile =
  | 'agentic-orchestrator'
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

export interface CognitiveModelItem extends ModelDescriptor {
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
  catalogo: CognitiveModelItem[];
  availableVramGb: number;
}
