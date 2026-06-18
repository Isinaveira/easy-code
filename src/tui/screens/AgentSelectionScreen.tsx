// src/tui/screens/AgentSelectionScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { AgentProfile } from '../../agents/index.js';
import theme from '../theme/index.js';

const ALL_AGENTS: AgentProfile[] = [
  'agentic-orchestrator',
  'phase-init',
  'phase-explore',
  'phase-propose',
  'phase-spec',
  'phase-design',
  'phase-tasks',
  'phase-apply',
  'phase-verify',
  'phase-archive',
  'phase-onboard',
  'consensus-judge-a',
  'consensus-judge-b',
  'consensus-fixer'
];

export const AgentSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [agentIndex, setAgentIndex] = useState(0);

  const totalOptions = ALL_AGENTS.length + 1; // Agents + Confirm button

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      dispatch({ type: 'GO_BACK' });
      return;
    }

    if (key.upArrow) {
      setAgentIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (key.downArrow) {
      setAgentIndex((prev) => (prev + 1) % totalOptions);
    } else if (input === ' ' || key.return) {
      if (agentIndex === ALL_AGENTS.length) {
        // Confirm & Continue button pressed
        if (state.selectedAgents.length > 0) {
          dispatch({ type: 'NAVIGATE', payload: 'HARDWARE_DETECTION' });
        }
      } else {
        // Toggle logic: just toggle agent check/uncheck status
        const agent = ALL_AGENTS[agentIndex];
        const isSelected = state.selectedAgents.includes(agent);
        if (isSelected) {
          dispatch({ type: 'TOGGLE_AGENT_OFF', payload: agent });
        } else {
          dispatch({
            type: 'TOGGLE_AGENT_ON',
            payload: { agent, model: 'none' }
          });
        }
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Selección de Agentes para el Nodo:
        </Text>
      </Box>

      {ALL_AGENTS.map((agent, index) => {
        const isActive = index === agentIndex;
        const isSelected = state.selectedAgents.includes(agent);

        const checkMark = isSelected ? theme.icons.checked : theme.icons.unchecked;
        const checkColor = isSelected ? theme.colors.success : theme.colors.gray;

        return (
          <Box key={agent} paddingLeft={isActive ? 0 : 2} flexDirection="row">
            {isActive ? (
              <Box flexDirection="row">
                <Text color={theme.colors.primary} bold>
                  {theme.icons.selector}
                </Text>
                <Text color={checkColor} bold>
                  {' '}{checkMark}{' '}
                </Text>
                <Text color={theme.colors.primary} bold>
                  {agent}
                </Text>
              </Box>
            ) : (
              <Box flexDirection="row">
                <Text color={checkColor}>
                  {checkMark}{' '}
                </Text>
                <Text color={theme.colors.white}>
                  {agent}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Confirm Button */}
      <Box key="confirm" paddingLeft={agentIndex === ALL_AGENTS.length ? 0 : 2} marginTop={1}>
        {agentIndex === ALL_AGENTS.length ? (
          <Text color={theme.colors.success} bold>
            {theme.icons.selector} ✔ Confirmar Agentes y Configurar Modelos
          </Text>
        ) : (
          <Text color={theme.colors.gray}>
            ✔ Confirmar Agentes y Configurar Modelos
          </Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.gray}>
          (Usa ↑/↓ para navegar, [Espacio] o [Enter] para marcar/desmarcar, Esc/b para volver)
        </Text>
        {state.selectedAgents.length === 0 && (
          <Text color={theme.colors.warning}>
            ⚠️ Debes seleccionar al menos un agente para poder continuar.
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default AgentSelectionScreen;
