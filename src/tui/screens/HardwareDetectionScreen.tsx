// src/tui/screens/HardwareDetectionScreen.tsx
import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { useServices } from '../providers/ServiceProvider.js';
import { LlmfitClient } from '../../registry/llmfit/client.js';
import { LlmfitRegistry } from '../../registry/llmfit/registry.js';
import { OllamaRegistry } from '../../registry/ollama/registry.js';
import { enrichModelDescriptor } from '../../agents/selector.js';
import theme from '../theme/index.js';

export const HardwareDetectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { detector } = useServices();

  const runDetection = async () => {
    dispatch({ type: 'START_DETECTION' });
    try {
      const profile = await detector.detect();
      const vram = profile.gpu ? profile.gpu.vramGb : profile.memory.totalGb;
      
      const llmfitClient = new LlmfitClient();
      const isLlmfitHealthy = await llmfitClient.health();
      
      let registry;
      if (isLlmfitHealthy) {
        registry = new LlmfitRegistry(llmfitClient);
      } else {
        registry = new OllamaRegistry();
      }
      
      const rawHubModels = await registry.listAvailable();
      const cognitiveCatalog = rawHubModels.map(enrichModelDescriptor);
      
      dispatch({
        type: 'SET_DETECTION_RESULTS',
        payload: {
          profile,
          vram,
          models: cognitiveCatalog,
          isLlmfitHealthy
        }
      });
      dispatch({ type: 'NAVIGATE', payload: 'AGENT_SELECTION' });
    } catch (err: any) {
      dispatch({
        type: 'SET_DETECTION_ERROR',
        payload: err.message || 'Error detecting hardware and models.'
      });
    }
  };

  useEffect(() => {
    runDetection();
  }, [detector, dispatch]);

  useInput((input, key) => {
    if (state.error) {
      if (input === 'r') {
        runDetection();
      } else if (key.escape || input === 'b') {
        dispatch({ type: 'GO_BACK' });
      }
    }
  });

  if (state.error) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color={theme.colors.error} bold>
          {theme.icons.error} Error en la detección de hardware/modelos:
        </Text>
        <Text color={theme.colors.white} marginY={1}>
          {state.error}
        </Text>
        <Text color={theme.colors.gray}>
          (Presiona r para reintentar, Esc/b para volver)
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={theme.colors.primary} bold>
        ⏳ {state.loadingMessage || 'Interrogando al sistema operativo...'}
      </Text>
    </Box>
  );
};

export default HardwareDetectionScreen;
