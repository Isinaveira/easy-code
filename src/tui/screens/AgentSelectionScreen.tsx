// src/tui/screens/AgentSelectionScreen.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import MultiSelectInput from '../components/MultiSelectInput.js';
import theme from '../theme/index.js';

export const AgentSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();

  const handleConfirm = (values: string[]) => {
    // If no agents are selected, we require at least one
    if (values.length === 0) {
      return;
    }
    dispatch({ type: 'SET_SELECTED_AGENTS', payload: values });
    dispatch({ type: 'NAVIGATE', payload: 'HARDWARE_DETECTION' });
  };

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      dispatch({ type: 'GO_BACK' });
    }
  });

  const options = [
    { value: 'agentic-orchestrator', label: 'agentic-orchestrator (Coordinador)' },
    { value: 'phase-init', label: 'phase-init' },
    { value: 'phase-explore', label: 'phase-explore' },
    { value: 'phase-propose', label: 'phase-propose' },
    { value: 'phase-spec', label: 'phase-spec' },
    { value: 'phase-design', label: 'phase-design' },
    { value: 'phase-tasks', label: 'phase-tasks' },
    { value: 'phase-apply', label: 'phase-apply' },
    { value: 'phase-verify', label: 'phase-verify' },
    { value: 'phase-archive', label: 'phase-archive' },
    { value: 'phase-onboard', label: 'phase-onboard' },
    { value: 'consensus-judge-a', label: 'consensus-judge-a' },
    { value: 'consensus-judge-b', label: 'consensus-judge-b' },
    { value: 'consensus-fixer', label: 'consensus-fixer' }
  ];

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Selecciona los agentes que se ejecutarán en este nodo:
        </Text>
      </Box>
      <MultiSelectInput
        options={options}
        initialSelected={state.selectedAgents}
        onSubmit={handleConfirm}
      />
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.gray}>
          (Usa ↑/↓ para navegar, [Espacio] para marcar, Enter para confirmar, Esc/b para volver)
        </Text>
        {state.selectedAgents.length === 0 && (
          <Text color={theme.colors.warning}>
            ⚠️ Debes seleccionar al menos un agente para continuar.
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default AgentSelectionScreen;
