// src/tui/state/reducer.test.ts
import { describe, expect, it } from 'vitest';
import { tuiReducer, INITIAL_STATE } from './reducer.js';
import { TuiState } from '../types.js';

describe('TUI State Reducer', () => {
  it('should handle NAVIGATE and GO_BACK transitions correctly', () => {
    let state = tuiReducer(INITIAL_STATE, { type: 'NAVIGATE', payload: 'NODE_ROLE' });
    expect(state.activeScreen).toBe('NODE_ROLE');
    expect(state.screenHistory).toEqual(['NODE_NAME']);

    state = tuiReducer(state, { type: 'NAVIGATE', payload: 'AGENT_SELECTION' });
    expect(state.activeScreen).toBe('AGENT_SELECTION');
    expect(state.screenHistory).toEqual(['NODE_NAME', 'NODE_ROLE']);

    state = tuiReducer(state, { type: 'GO_BACK' });
    expect(state.activeScreen).toBe('NODE_ROLE');
    expect(state.screenHistory).toEqual(['NODE_NAME']);

    state = tuiReducer(state, { type: 'GO_BACK' });
    expect(state.activeScreen).toBe('NODE_NAME');
    expect(state.screenHistory).toEqual([]);
  });

  it('should handle name, role, and agent selections', () => {
    let state = tuiReducer(INITIAL_STATE, { type: 'SET_NODE_NAME', payload: 'master-01' });
    expect(state.nodeName).toBe('master-01');

    state = tuiReducer(state, { type: 'SET_NODE_ROLE', payload: 'master' });
    expect(state.nodeRole).toBe('master');

    state = tuiReducer(state, { type: 'SET_SELECTED_AGENTS', payload: ['phase-init', 'phase-explore'] });
    expect(state.selectedAgents).toEqual(['phase-init', 'phase-explore']);
    expect(state.currentAgentIndex).toBe(0);
  });

  it('should route to SAVE_CONFIG when final agent model is assigned', () => {
    const testState: TuiState = {
      ...INITIAL_STATE,
      activeScreen: 'MODEL_SELECTION',
      screenHistory: ['AGENT_SELECTION'],
      selectedAgents: ['phase-init', 'phase-explore'],
      currentAgentIndex: 0,
      modelAssignments: {}
    };

    // Assign model to first agent (index 0)
    let state = tuiReducer(testState, {
      type: 'ASSIGN_MODEL_TO_AGENT',
      payload: { agent: 'phase-init', model: 'phi3:mini' }
    });

    expect(state.modelAssignments).toEqual({ 'phase-init': 'phi3:mini' });
    expect(state.currentAgentIndex).toBe(1);
    expect(state.activeScreen).toBe('MODEL_SELECTION'); // still selecting models

    // Assign model to second/last agent (index 1)
    state = tuiReducer(state, {
      type: 'ASSIGN_MODEL_TO_AGENT',
      payload: { agent: 'phase-explore', model: 'gemma2:9b' }
    });

    expect(state.modelAssignments).toEqual({
      'phase-init': 'phi3:mini',
      'phase-explore': 'gemma2:9b'
    });
    expect(state.activeScreen).toBe('SAVE_CONFIG');
    expect(state.screenHistory).toEqual(['AGENT_SELECTION', 'MODEL_SELECTION']);
  });

  it('should navigate back to previous screen if PREVIOUS_AGENT is dispatched at index 0', () => {
    const testState: TuiState = {
      ...INITIAL_STATE,
      activeScreen: 'MODEL_SELECTION',
      screenHistory: ['AGENT_SELECTION'],
      selectedAgents: ['phase-init', 'phase-explore'],
      currentAgentIndex: 0
    };

    const state = tuiReducer(testState, { type: 'PREVIOUS_AGENT' });
    expect(state.activeScreen).toBe('AGENT_SELECTION');
    expect(state.screenHistory).toEqual([]);
  });

  it('should decrement agent index on PREVIOUS_AGENT if index > 0', () => {
    const testState: TuiState = {
      ...INITIAL_STATE,
      activeScreen: 'MODEL_SELECTION',
      screenHistory: ['AGENT_SELECTION'],
      selectedAgents: ['phase-init', 'phase-explore'],
      currentAgentIndex: 1
    };

    const state = tuiReducer(testState, { type: 'PREVIOUS_AGENT' });
    expect(state.currentAgentIndex).toBe(0);
    expect(state.activeScreen).toBe('MODEL_SELECTION');
  });
});
