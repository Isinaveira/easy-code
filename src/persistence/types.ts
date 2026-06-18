// src/persistence/types.ts
import { HardwareProfile } from '../hardware/index.js';

export interface NodeState {
  nodeName: string;
  nodeRole: string;
  activeAgents: string[];
  hardwareProfile?: HardwareProfile;
  modelAssignments?: Record<string, string>;
}

export interface PersistenceStore {
  saveNodeState(state: NodeState): Promise<void>;
  loadNodeState(): Promise<NodeState | null>;
}

export interface EnvironmentWriter {
  saveEnv(config: Record<string, string>): Promise<void>;
}
