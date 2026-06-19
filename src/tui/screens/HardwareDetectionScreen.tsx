// src/tui/screens/HardwareDetectionScreen.tsx
import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { useServices } from '../providers/ServiceProvider.js';
import { LlmfitClient } from '../../registry/llmfit/client.js';
import { ModelSelector } from '../../agents/ModelSelector.js';
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
      const selector = new ModelSelector(llmfitClient);
      if (profile) {
        selector.setHardwareProfile(profile);
      }

      const modelsByAgent: Record<string, any[]> = {};
      const allFetchedModels: any[] = [];

      for (const agent of state.selectedAgents) {
        // Query llmfit with filters and fallback sequence for this specific agent
        const rawAgentModels = await selector.getCandidatesForAgent(agent as any);
        const enriched = rawAgentModels.map(enrichModelDescriptor);
        modelsByAgent[agent] = enriched;
        allFetchedModels.push(...enriched);
      }

      // Deduplicate allFetchedModels by name for backwards compatibility
      const uniqueModels = allFetchedModels.filter(
        (model, index, self) => self.findIndex((m) => m.name === model.name) === index
      );
      
      dispatch({
        type: 'SET_DETECTION_RESULTS',
        payload: {
          profile,
          vram,
          models: uniqueModels,
          modelsByAgent,
          isLlmfitHealthy: true
        }
      });
      dispatch({ type: 'NAVIGATE', payload: 'MODEL_SELECTION' });
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
