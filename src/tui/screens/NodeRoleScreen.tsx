// src/tui/screens/NodeRoleScreen.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import SelectInput from '../components/SelectInput.js';
import theme from '../theme/index.js';

export const NodeRoleScreen: React.FC = () => {
  const { dispatch } = useAppState();

  const handleSelect = (value: string) => {
    dispatch({ type: 'SET_NODE_ROLE', payload: value as 'master' | 'worker' });
    dispatch({ type: 'NAVIGATE', payload: 'HARDWARE_DETECTION' });
  };

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      dispatch({ type: 'GO_BACK' });
    }
  });

  const options = [
    { value: 'master', label: 'Master' },
    { value: 'worker', label: 'Worker' }
  ];

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Selecciona el rol de este nodo:
        </Text>
      </Box>
      <SelectInput options={options} onSubmit={handleSelect} />
      <Box marginTop={1}>
        <Text color={theme.colors.gray}>
          (Usa ↑/↓ para navegar, Enter para confirmar, Esc/b para volver)
        </Text>
      </Box>
    </Box>
  );
};

export default NodeRoleScreen;
