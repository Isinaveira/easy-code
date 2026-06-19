// src/tui/types.ts
import { HardwareProfile } from '../hardware/index.js';
import { CognitiveModelItem } from '../agents/types.js';

export type ScreenType =
  | 'NODE_NAME'
  | 'NODE_ROLE'
  | 'AGENT_SELECTION'
  | 'HF_TOKEN'
  | 'HARDWARE_DETECTION'
  | 'MODEL_SELECTION'
  | 'SAVE_CONFIG';

export interface TuiState {
  // Navigation
  activeScreen: ScreenType;
  screenHistory: ScreenType[];

  // Wizard fields
  nodeName: string;
  nodeRole: 'master' | 'worker';
  selectedAgents: string[];

  // Hardware and Model Catalog
  hardwareProfile: HardwareProfile | null;
  detectedVram: number;
  availableModels: CognitiveModelItem[];
  availableModelsByAgent: Record<string, CognitiveModelItem[]>;
  modelAssignments: Record<string, string>; // agentProfile -> selectedModelName
  currentAgentIndex: number; // Index of the agent currently being configured for models

  // Registry details
  isLlmfitHealthy: boolean;

  // Status flags
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  hfToken?: string;
}

export type TuiAction =
  | { type: 'NAVIGATE'; payload: ScreenType }
  | { type: 'GO_BACK' }
  | { type: 'SET_NODE_NAME'; payload: string }
  | { type: 'SET_NODE_ROLE'; payload: 'master' | 'worker' }
  | { type: 'SET_SELECTED_AGENTS'; payload: string[] }
  | { type: 'START_DETECTION' }
  | { type: 'SET_DETECTION_RESULTS'; payload: { profile: HardwareProfile; vram: number; models: CognitiveModelItem[]; modelsByAgent?: Record<string, CognitiveModelItem[]>; isLlmfitHealthy: boolean } }
  | { type: 'SET_DETECTION_ERROR'; payload: string }
  | { type: 'ASSIGN_MODEL_TO_AGENT'; payload: { agent: string; model: string } }
  | { type: 'TOGGLE_AGENT_ON'; payload: { agent: string; model: string } }
  | { type: 'TOGGLE_AGENT_OFF'; payload: string }
  | { type: 'PREVIOUS_AGENT' }
  | { type: 'START_SAVE' }
  | { type: 'SET_SAVE_SUCCESS' }
  | { type: 'SET_SAVE_ERROR'; payload: string }
  | { type: 'SET_HF_TOKEN'; payload: string };
