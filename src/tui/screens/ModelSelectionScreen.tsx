// src/tui/screens/ModelSelectionScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { getSegmentedCatalogForAgent, AGENT_REQUIREMENTS_MAP, AgentProfile } from '../../agents/index.js';
import theme from '../theme/index.js';

function formatModelName(name: string, maxLen: number = 32): string {
  if (name.length <= maxLen) {
    return name.padEnd(maxLen);
  }
  const leftChars = Math.floor((maxLen - 3) / 2);
  const rightChars = maxLen - 3 - leftChars;
  return name.slice(0, leftChars) + '...' + name.slice(-rightChars);
}

export const ModelSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();

  // Modal scrolling states
  const [modelIndex, setModelIndex] = useState(0);
  const [modelScrollOffset, setModelScrollOffset] = useState(0);
  const visibleCount = 10;

  const agent = state.selectedAgents[state.currentAgentIndex] as AgentProfile | undefined;

  const getCompatibleModels = (currentAgent: AgentProfile) => {
    const reqs = AGENT_REQUIREMENTS_MAP[currentAgent];
    return state.availableModels
      .filter((m) => m.sizeGb <= state.detectedVram)
      .sort((a, b) => {
        const scoreA = a.score || a.metrics[reqs.priorityMetric] || 50;
        const scoreB = b.score || b.metrics[reqs.priorityMetric] || 50;
        return scoreB - scoreA;
      });
  };

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      dispatch({ type: 'PREVIOUS_AGENT' });
      // Reset scroll state on screen navigation
      setModelIndex(0);
      setModelScrollOffset(0);
      return;
    }

    if (!agent) return;
    const models = getCompatibleModels(agent);

    if (models.length === 0) {
      if (key.return) {
        dispatch({
          type: 'ASSIGN_MODEL_TO_AGENT',
          payload: { agent, model: 'none' }
        });
        setModelIndex(0);
        setModelScrollOffset(0);
      }
      return;
    }

    if (key.upArrow) {
      if (modelIndex > 0) {
        const nextIdx = modelIndex - 1;
        setModelIndex(nextIdx);
        if (nextIdx < modelScrollOffset) {
          setModelScrollOffset(nextIdx);
        }
      }
    } else if (key.downArrow) {
      if (modelIndex < models.length - 1) {
        const nextIdx = modelIndex + 1;
        setModelIndex(nextIdx);
        if (nextIdx >= modelScrollOffset + visibleCount) {
          setModelScrollOffset(nextIdx - visibleCount + 1);
        }
      }
    } else if (key.return) {
      const selectedModel = models[modelIndex];
      if (selectedModel) {
        dispatch({
          type: 'ASSIGN_MODEL_TO_AGENT',
          payload: { agent, model: selectedModel.name }
        });
      }
      // Reset scroll for the next agent
      setModelIndex(0);
      setModelScrollOffset(0);
    }
  });

  if (!agent) {
    return null;
  }

  const reqs = AGENT_REQUIREMENTS_MAP[agent];
  const minCaps = reqs.requiredCapabilities.length > 0 ? reqs.requiredCapabilities.join(', ') : 'None';
  const outFmts = reqs.outputFormats.length > 0 ? reqs.outputFormats.join(', ') : 'Any';

  const models = getCompatibleModels(agent);
  const hasNoModels = models.length === 0;

  const visibleModels = models.slice(modelScrollOffset, modelScrollOffset + visibleCount);
  const hasMoreAbove = modelScrollOffset > 0;
  const hasMoreBelow = modelScrollOffset + visibleCount < models.length;

  const header = `     ${'MODELO'.padEnd(24)} ${'PARAMS'.padStart(6)} ${'SCORE'.padStart(5)} ${'QUANT'.padEnd(6)} ${'TAMAÑO'.padStart(6)} ${'USO'.padEnd(7)}`;

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Agent details */}
      <Box borderStyle="round" borderColor="blue" flexDirection="column" padding={1} marginBottom={1}>
        <Text color={theme.colors.secondary} bold>
          {theme.icons.agent} Configurando Agente: {agent} ({state.currentAgentIndex + 1}/{state.selectedAgents.length})
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.white}>• Min. Contexto : {reqs.minContextWindow} tokens</Text>
          <Text color={theme.colors.white}>• Habilidades   : {minCaps}</Text>
          <Text color={theme.colors.white}>• Format Salida : {outFmts}</Text>
        </Box>
      </Box>

      {/* Model Selection */}
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Selecciona modelo para {agent}:
        </Text>
      </Box>

      {hasNoModels ? (
        <Box flexDirection="column">
          <Text color={theme.colors.error} bold>
            {theme.icons.warning} No compatible models found. Insufficient hardware for this agent.
          </Text>
          <Text color={theme.colors.gray} marginTop={1}>
            (Presiona Enter para omitir, Esc/b para volver)
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {/* Table Header */}
          <Box marginBottom={1}>
            <Text color={theme.colors.gray} bold>
              {header}
            </Text>
          </Box>

          {hasMoreAbove && (
            <Box paddingLeft={4}>
              <Text color={theme.colors.primary}>▲ ({modelScrollOffset} más arriba)</Text>
            </Box>
          )}

          {visibleModels.map((m, index) => {
            const actualIndex = modelScrollOffset + index;
            const isSelected = actualIndex === modelIndex;
            const mScore = m.score || m.metrics[reqs.priorityMetric] || 50;
            const mUse = m.use || 'general';

            const nameStr = formatModelName(m.name, 24);
            const paramsStr = (m.params || 'N/A').padStart(6).slice(-6);
            const scoreStr = mScore.toFixed(1).padStart(5);
            const quantStr = (m.quant || 'N/A').padEnd(6).slice(0, 6);
            const sizeStr = `${m.sizeGb.toFixed(1)}G`.padStart(6);
            const useStr = mUse.toUpperCase().slice(0, 7).padEnd(7);

            return (
              <Box key={m.name} paddingLeft={isSelected ? 2 : 4} flexDirection="row">
                {isSelected ? (
                  <Text color={theme.colors.primary} bold>
                    {theme.icons.selector} {nameStr}
                  </Text>
                ) : (
                  <Text color={theme.colors.white}>{nameStr}</Text>
                )}
                <Text color={isSelected ? theme.colors.primary : theme.colors.white}>
                  {` ${paramsStr} ${scoreStr} ${quantStr} ${sizeStr} ${useStr}`}
                </Text>
              </Box>
            );
          })}

          {hasMoreBelow && (
            <Box paddingLeft={4}>
              <Text color={theme.colors.primary}>▼ ({models.length - (modelScrollOffset + visibleCount)} más abajo)</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color={theme.colors.gray}>
              (Usa ↑/↓ para navegar, Enter para confirmar, Esc/b para volver al agente anterior)
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ModelSelectionScreen;
