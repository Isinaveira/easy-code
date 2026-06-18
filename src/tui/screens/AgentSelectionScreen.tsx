// src/tui/screens/AgentSelectionScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { AGENT_REQUIREMENTS_MAP, AgentProfile } from '../../agents/index.js';
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

function formatModelName(name: string, maxLen: number = 32): string {
  if (name.length <= maxLen) {
    return name.padEnd(maxLen);
  }
  const leftChars = Math.floor((maxLen - 3) / 2);
  const rightChars = maxLen - 3 - leftChars;
  return name.slice(0, leftChars) + '...' + name.slice(-rightChars);
}

export const AgentSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  
  // Navigation & selection states
  const [activeModalAgent, setActiveModalAgent] = useState<AgentProfile | null>(null);
  const [agentIndex, setAgentIndex] = useState(0);

  // Modal scrolling states
  const [modelIndex, setModelIndex] = useState(0);
  const [modelScrollOffset, setModelScrollOffset] = useState(0);
  const visibleCount = 10;

  const totalOptions = ALL_AGENTS.length + 1; // Agents + Confirm button

  // Get compatible models for currently selected modal agent
  const getCompatibleModels = (agent: AgentProfile) => {
    const reqs = AGENT_REQUIREMENTS_MAP[agent];
    return state.availableModels
      .filter((m) => m.sizeGb <= state.detectedVram)
      .sort((a, b) => {
        const scoreA = a.score || a.metrics[reqs.priorityMetric] || 50;
        const scoreB = b.score || b.metrics[reqs.priorityMetric] || 50;
        return scoreB - scoreA;
      });
  };

  useInput((input, key) => {
    // ----------------------------------------------------
    // CASE A: Modal Mode (Selecting Model for active agent)
    // ----------------------------------------------------
    if (activeModalAgent) {
      const models = getCompatibleModels(activeModalAgent);

      if (key.escape || input === 'b') {
        setActiveModalAgent(null);
        return;
      }

      if (models.length === 0) {
        if (key.return) {
          setActiveModalAgent(null);
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
            type: 'TOGGLE_AGENT_ON',
            payload: { agent: activeModalAgent, model: selectedModel.name }
          });
        }
        setActiveModalAgent(null);
      }
      return;
    }

    // ----------------------------------------------------
    // CASE B: Standard Mode (Navigating Agents List)
    // ----------------------------------------------------
    if (key.escape || input === 'b') {
      dispatch({ type: 'GO_BACK' });
      return;
    }

    if (key.upArrow) {
      setAgentIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (key.downArrow) {
      setAgentIndex((prev) => (prev + 1) % totalOptions);
    } else if (input === ' ') {
      // Toggle logic using Spacebar
      if (agentIndex < ALL_AGENTS.length) {
        const agent = ALL_AGENTS[agentIndex];
        const isSelected = state.selectedAgents.includes(agent);
        if (isSelected) {
          dispatch({ type: 'TOGGLE_AGENT_OFF', payload: agent });
        } else {
          // Reset modal scrolling when opening
          setModelIndex(0);
          setModelScrollOffset(0);
          setActiveModalAgent(agent);
        }
      }
    } else if (key.return) {
      if (agentIndex === ALL_AGENTS.length) {
        // Confirm & Continue button pressed
        if (state.selectedAgents.length > 0) {
          dispatch({ type: 'NAVIGATE', payload: 'SAVE_CONFIG' });
        }
      } else {
        // Pressing Enter on an agent toggles it or opens model options
        const agent = ALL_AGENTS[agentIndex];
        setModelIndex(0);
        setModelScrollOffset(0);
        setActiveModalAgent(agent);
      }
    }
  });

  // Render Modal selection
  if (activeModalAgent) {
    const models = getCompatibleModels(activeModalAgent);
    const reqs = AGENT_REQUIREMENTS_MAP[activeModalAgent];
    
    const visibleModels = models.slice(modelScrollOffset, modelScrollOffset + visibleCount);
    const hasMoreAbove = modelScrollOffset > 0;
    const hasMoreBelow = modelScrollOffset + visibleCount < models.length;

    const header = `     ${'MODELO'.padEnd(35)}   ${'SCORE'.padStart(5)}   ${'CASO DE USO'.padEnd(16)}   ${'TAMAÑO'.padStart(8)}`;

    return (
      <Box flexDirection="column" borderStyle="single" borderColor="magenta" padding={1}>
        <Text color={theme.colors.secondary} bold>
          {theme.icons.agent} Seleccionar Modelo para: {activeModalAgent}
        </Text>
        <Text color={theme.colors.gray} marginBottom={1}>
          Requisitos: Mín. Contexto {reqs.minContextWindow} tokens | Habilidades: {reqs.requiredCapabilities.join(', ') || 'General'}
        </Text>

        {models.length === 0 ? (
          <Box flexDirection="column" marginY={1}>
            <Text color={theme.colors.error} bold>
              ⚠️ No compatible models found. Insufficient hardware for this agent.
            </Text>
            <Text color={theme.colors.white} marginTop={1}>
              Presiona Enter para volver.
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

              const nameStr = formatModelName(m.name, 35);
              const scoreStr = mScore.toFixed(1).padStart(5);
              const useStr = mUse.toUpperCase().slice(0, 16).padEnd(16);
              const sizeStr = `${m.sizeGb.toFixed(1)} GB`.padStart(8);

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
                    {`   ${scoreStr}   ${useStr}   ${sizeStr}`}
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
                (Usa ↑/↓ para navegar, Enter para confirmar, Esc/b para volver)
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Render main screen
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Configuración de Agentes y Modelos del Nodo:
        </Text>
      </Box>

      {ALL_AGENTS.map((agent, index) => {
        const isActive = index === agentIndex;
        const isSelected = state.selectedAgents.includes(agent);
        const assignedModel = state.modelAssignments[agent];

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
                {isSelected && assignedModel && (
                  <Text color={theme.colors.success}>
                    {' '}(Model: {assignedModel})
                  </Text>
                )}
              </Box>
            ) : (
              <Box flexDirection="row">
                <Text color={checkColor}>
                  {checkMark}{' '}
                </Text>
                <Text color={theme.colors.white}>
                  {agent}
                </Text>
                {isSelected && assignedModel && (
                  <Text color={theme.colors.gray}>
                    {' '}(Model: {assignedModel})
                  </Text>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {/* Confirm Button */}
      <Box key="confirm" paddingLeft={agentIndex === ALL_AGENTS.length ? 0 : 2} marginTop={1}>
        {agentIndex === ALL_AGENTS.length ? (
          <Text color={theme.colors.success} bold>
            {theme.icons.selector} ✔ Confirmar y Guardar Configuración
          </Text>
        ) : (
          <Text color={theme.colors.gray}>
            ✔ Confirmar y Guardar Configuración
          </Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.gray}>
          (Usa ↑/↓ para navegar, [Espacio] para activar/desactivar, Enter para seleccionar/cambiar modelo, Esc/b para volver)
        </Text>
        {state.selectedAgents.length === 0 && (
          <Text color={theme.colors.warning}>
            ⚠️ Debes seleccionar y asignar al menos un agente para poder continuar.
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default AgentSelectionScreen;
