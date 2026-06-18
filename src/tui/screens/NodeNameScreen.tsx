// src/tui/screens/NodeNameScreen.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import TextInput from '../components/TextInput.js';
import theme from '../theme/index.js';

export const NodeNameScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [value, setValue] = useState(state.nodeName || 'master-node-01');

  const handleSubmit = () => {
    const finalName = value.trim() || 'master-node-01';
    dispatch({ type: 'SET_NODE_NAME', payload: finalName });
    dispatch({ type: 'NAVIGATE', payload: 'NODE_ROLE' });
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          ¿Qué nombre deseas asignarle a este nodo?
        </Text>
      </Box>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="master-node-01"
      />
      <Box marginTop={1}>
        <Text color={theme.colors.gray}>
          (Presiona Enter para confirmar. Por defecto: master-node-01)
        </Text>
      </Box>
    </Box>
  );
};

export default NodeNameScreen;
