// src/tui/state/reducer.ts
import { TuiState, TuiAction, ScreenType } from '../types.js';

export const INITIAL_STATE: TuiState = {
  activeScreen: 'NODE_NAME',
  screenHistory: [],
  nodeName: '',
  nodeRole: 'worker',
  selectedAgents: [],
  hardwareProfile: null,
  detectedVram: 0,
  availableModels: [],
  availableModelsByAgent: {},
  modelAssignments: {},
  currentAgentIndex: 0,
  isLlmfitHealthy: false,
  loading: false,
  loadingMessage: '',
  error: null,
  saveStatus: 'idle',
  hfToken: ''
};

export function tuiReducer(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        ...state,
        screenHistory: [...state.screenHistory, state.activeScreen],
        activeScreen: action.payload
      };

    case 'GO_BACK': {
      if (state.screenHistory.length === 0) return state;
      const newHistory = [...state.screenHistory];
      const previousScreen = newHistory.pop() as ScreenType;
      return {
        ...state,
        screenHistory: newHistory,
        activeScreen: previousScreen
      };
    }

    case 'SET_NODE_NAME':
      return {
        ...state,
        nodeName: action.payload
      };

    case 'SET_NODE_ROLE':
      return {
        ...state,
        nodeRole: action.payload
      };

    case 'SET_SELECTED_AGENTS':
      return {
        ...state,
        selectedAgents: action.payload,
        modelAssignments: {}, // Reset assignments when active agents list changes
        currentAgentIndex: 0
      };

    case 'START_DETECTION':
      return {
        ...state,
        loading: true,
        loadingMessage: 'Analyzing hardware resources & fetching catalogs...',
        error: null
      };

    case 'SET_DETECTION_RESULTS':
      return {
        ...state,
        loading: false,
        loadingMessage: '',
        hardwareProfile: action.payload.profile,
        detectedVram: action.payload.vram,
        availableModels: action.payload.models,
        availableModelsByAgent: action.payload.modelsByAgent || {},
        isLlmfitHealthy: action.payload.isLlmfitHealthy
      };

    case 'SET_DETECTION_ERROR':
      return {
        ...state,
        loading: false,
        loadingMessage: '',
        error: action.payload
      };

    case 'ASSIGN_MODEL_TO_AGENT': {
      const nextIndex = state.currentAgentIndex + 1;
      const assignments = {
        ...state.modelAssignments,
        [action.payload.agent]: action.payload.model
      };

      if (nextIndex >= state.selectedAgents.length) {
        // Finished all agent model configurations -> navigate to save
        return {
          ...state,
          modelAssignments: assignments,
          screenHistory: [...state.screenHistory, state.activeScreen],
          activeScreen: 'SAVE_CONFIG'
        };
      }

      return {
        ...state,
        modelAssignments: assignments,
        currentAgentIndex: nextIndex
      };
    }

    case 'TOGGLE_AGENT_ON': {
      const { agent, model } = action.payload;
      const selectedAgents = state.selectedAgents.includes(agent)
        ? state.selectedAgents
        : [...state.selectedAgents, agent];
      return {
        ...state,
        selectedAgents,
        modelAssignments: {
          ...state.modelAssignments,
          [agent]: model
        }
      };
    }

    case 'TOGGLE_AGENT_OFF': {
      const agent = action.payload;
      const selectedAgents = state.selectedAgents.filter(a => a !== agent);
      const modelAssignments = { ...state.modelAssignments };
      delete modelAssignments[agent];
      return {
        ...state,
        selectedAgents,
        modelAssignments
      };
    }

    case 'PREVIOUS_AGENT': {
      if (state.currentAgentIndex > 0) {
        return {
          ...state,
          currentAgentIndex: state.currentAgentIndex - 1
        };
      }
      // If we are at index 0, navigate back in screen history
      const newHistory = [...state.screenHistory];
      const previousScreen = newHistory.pop() || 'AGENT_SELECTION';
      return {
        ...state,
        screenHistory: newHistory,
        activeScreen: previousScreen
      };
    }

    case 'START_SAVE':
      return {
        ...state,
        saveStatus: 'saving',
        loading: true,
        loadingMessage: 'Saving configuration state to cluster configs...'
      };

    case 'SET_SAVE_SUCCESS':
      return {
        ...state,
        loading: false,
        loadingMessage: '',
        saveStatus: 'success'
      };

    case 'SET_SAVE_ERROR':
      return {
        ...state,
        loading: false,
        loadingMessage: '',
        saveStatus: 'error',
        error: action.payload
      };

    case 'SET_HF_TOKEN':
      return {
        ...state,
        hfToken: action.payload
      };

    default:
      return state;
  }
}
