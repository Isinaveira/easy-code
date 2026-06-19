// src/tui/screens/HFTokenScreen.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import TextInput from '../components/TextInput.js';
import theme from '../theme/index.js';

export const HFTokenScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [value, setValue] = useState(state.hfToken || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const finalToken = value.trim();
    if (!finalToken) {
      setError('El token de Hugging Face es obligatorio.');
      return;
    }
    dispatch({ type: 'SET_HF_TOKEN', payload: finalToken });
    dispatch({ type: 'NAVIGATE', payload: 'HARDWARE_DETECTION' });
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Introduce tu Hugging Face Token:
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={theme.colors.gray}>
          El token de Hugging Face se usará de forma segura para buscar la telemetría semántica de modelos restringidos (como Meta Llama) o repositorios privados.
        </Text>
      </Box>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="hf_..."
        mask="*"
      />
      <Box marginTop={1}>
        {error ? (
          <Text color="red" bold>
            {error}
          </Text>
        ) : (
          <Text color={theme.colors.gray}>
            (Presiona Enter para continuar. Se guardará de forma segura en tu .env local).
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default HFTokenScreen;
