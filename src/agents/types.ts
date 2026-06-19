// src/agents/types.ts
import { ModelDescriptor } from '../compatibility/types.js';

export type Capability = 'reasoning' | 'coding' | 'tool-calling' | 'json-mode' | 'vision';

export type OutputFormat = 'markdown' | 'json' | 'code' | 'text';

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

export type CognitiveProfile =
  | 'EXPLORER'
  | 'ORCHESTRATOR'
  | 'PLANNER'
  | 'ARCHITECT'
  | 'CODER'
  | 'VALIDATOR'
  | 'LIGHTWEIGHT'
  | 'SECRETARY';

export interface ModelRequirements {
  minContextWindow: number;
  requiredCapabilities: Capability[];
  outputFormats: OutputFormat[];
  priorityMetric: 'reasoning' | 'coding' | 'speed';
}

export interface CognitiveModelItem extends ModelDescriptor {
  contextWindow: number;
  capabilities: Capability[];
  supportedOutputFormats: OutputFormat[];
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
