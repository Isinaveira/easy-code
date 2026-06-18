// src/tui/screens/ModelSelectionScreen.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import SelectInput from '../components/SelectInput.js';
import { getSegmentedCatalogForAgent, AGENT_REQUIREMENTS_MAP, AgentProfile } from '../../agents/index.js';
import theme from '../theme/index.js';

export const ModelSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();

  const agent = state.selectedAgents[state.currentAgentIndex] as AgentProfile | undefined;

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      dispatch({ type: 'PREVIOUS_AGENT' });
    }
  });

  if (!agent) {
    return null;
  }

  const reqs = AGENT_REQUIREMENTS_MAP[agent];
  const minCaps = reqs.requiredCapabilities.length > 0 ? reqs.requiredCapabilities.join(', ') : 'None';
  const outFmts = reqs.outputFormats.length > 0 ? reqs.outputFormats.join(', ') : 'Any';

  const { recommended, fallback } = getSegmentedCatalogForAgent(
    agent,
    state.availableModels,
    state.detectedVram
  );

  const hasNoModels = recommended.length === 0 && fallback.length === 0;

  const handleSelect = (modelName: string) => {
    dispatch({
      type: 'ASSIGN_MODEL_TO_AGENT',
      payload: { agent, model: modelName }
    });
  };

  // If no models found, bind Enter to skip the current agent
  useInput((input, key) => {
    if (hasNoModels && key.return) {
      dispatch({
        type: 'ASSIGN_MODEL_TO_AGENT',
        payload: { agent, model: 'none' }
      });
    }
  });

  const options = [
    ...recommended.map((m) => ({
      value: m.name,
      label: `${theme.icons.star} ${m.name}`,
      hint: `${m.sizeGb}GB | ctx:${m.contextWindow} | ${reqs.priorityMetric}:${m.metrics[reqs.priorityMetric]}`
    })),
    ...fallback.map((m) => ({
      value: m.name,
      label: `${theme.icons.warning} (Fallback) ${m.name}`,
      hint: `${m.sizeGb}GB | ctx:${m.contextWindow} | ${reqs.priorityMetric}:${m.metrics[reqs.priorityMetric]}`
    }))
  ];

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Agent details */}
      <Box borderStyle="round" borderColor="blue" flexDirection="column" padding={1} marginBottom={1}>
        <Text color={theme.colors.secondary} bold>
          {theme.icons.agent} Agent: {agent} ({state.currentAgentIndex + 1}/{state.selectedAgents.length})
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.white}>• Min. Context   : {reqs.minContextWindow} tokens</Text>
          <Text color={theme.colors.white}>• Min. Skills    : {minCaps}</Text>
          <Text color={theme.colors.white}>• Output Formats : {outFmts}</Text>
          <Text color={theme.colors.white}>• Priority Metric: {reqs.priorityMetric.toUpperCase()}</Text>
        </Box>
      </Box>

      {/* Model Selection */}
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Select model for {agent}:
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
          <SelectInput options={options} onSubmit={handleSelect} />
          <Box marginTop={1}>
            <Text color={theme.colors.gray}>
              (Usa ↑/↓ para navegar, Enter para confirmar, Esc/b para volver)
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ModelSelectionScreen;
