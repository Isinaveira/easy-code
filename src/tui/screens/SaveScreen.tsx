// src/tui/screens/SaveScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { useServices } from '../providers/ServiceProvider.js';
import { execa } from 'execa';
import theme from '../theme/index.js';
import { ModelSelector } from '../../agents/ModelSelector.js';
import { LlmfitClient } from '../../registry/llmfit/client.js';

function formatModelName(name: string, maxLen: number = 32): string {
  if (name.length <= maxLen) {
    return name.padEnd(maxLen);
  }
  const leftChars = Math.floor((maxLen - 3) / 2);
  const rightChars = maxLen - 3 - leftChars;
  return name.slice(0, leftChars) + '...' + name.slice(-rightChars);
}

export async function getTailscaleIP(): Promise<string | null> {
  try {
    const { stdout } = await execa('tailscale', ['ip', '-4']);
    return stdout.trim();
  } catch {
    return null;
  }
}

export const SaveScreen: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { jsonStore, envWriter } = useServices();
  const { exit } = useApp();
  const [tailscaleIp, setTailscaleIp] = useState<string | null>(null);
  const [tailscaleChecked, setTailscaleChecked] = useState(false);
  const [resolvedModels, setResolvedModels] = useState<Record<string, string>>(state.modelAssignments);

  const performSave = async () => {
    dispatch({ type: 'START_SAVE' });
    try {
      const ip = await getTailscaleIP();
      setTailscaleIp(ip);
      setTailscaleChecked(true);

      // Dynamically select models using ModelSelector
      const client = new LlmfitClient();
      const selector = new ModelSelector(client, undefined, state.hfToken);
      if (state.hardwareProfile) {
        selector.setHardwareProfile(state.hardwareProfile);
      }

      const resolvedAssignments: Record<string, string> = { ...state.modelAssignments };
      for (const agent of state.selectedAgents) {
        try {
          const modelDesc = await selector.selectModelForAgent(agent as any);
          resolvedAssignments[agent] = modelDesc.name;
        } catch (err) {
          console.warn(`[SaveScreen] ModelSelector no pudo resolver para ${agent}, usando manual o 'none':`, err);
          if (!resolvedAssignments[agent]) {
            resolvedAssignments[agent] = 'none';
          }
        }
      }

      setResolvedModels(resolvedAssignments);

      // Save structured node state
      await jsonStore.saveNodeState({
        nodeName: state.nodeName,
        nodeRole: state.nodeRole,
        activeAgents: state.selectedAgents,
        hardwareProfile: state.hardwareProfile || undefined,
        modelAssignments: resolvedAssignments
      });

      // Save environment configuration
      const envConfig: Record<string, string> = {
        NODE_NAME: state.nodeName,
        NODE_ROLE: state.nodeRole,
        ACTIVE_AGENTS: state.selectedAgents.join(','),
        AVAILABLE_VRAM: state.detectedVram.toString(),
        ...(ip && { TAILSCALE_IP: ip }),
        ...(state.hfToken && { HF_TOKEN: state.hfToken })
      };

      // Expose selected models in environment
      for (const [agent, model] of Object.entries(resolvedAssignments)) {
        const envKey = `MODEL_${agent.toUpperCase().replace(/-/g, '_')}`;
        envConfig[envKey] = model;
      }

      await envWriter.saveEnv(envConfig);

      dispatch({ type: 'SET_SAVE_SUCCESS' });
    } catch (err: any) {
      dispatch({
        type: 'SET_SAVE_ERROR',
        payload: err.message || 'Error guardando la configuración.'
      });
    }
  };

  useEffect(() => {
    performSave();
  }, [jsonStore, envWriter, dispatch]);

  useInput((input, key) => {
    if (state.saveStatus === 'success' && key.return) {
      exit();
      // Also fallback to process.exit if in a tests env or standalone CLI context
      setTimeout(() => process.exit(0), 100);
    } else if (state.saveStatus === 'error' && input === 'r') {
      performSave();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Configuration Summary */}
      <Box borderStyle="single" borderColor="yellow" flexDirection="column" padding={1} marginBottom={1}>
        <Text color={theme.colors.warning} bold>
          🎯 Resumen de Asignaciones:
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.white}>• Nodo: {state.nodeName} ({state.nodeRole})</Text>
          <Text color={theme.colors.white}>• Agentes Activos: {state.selectedAgents.join(', ')}</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.primary} bold>Asignaciones de Modelos:</Text>
            {Object.entries(resolvedModels).map(([agent, model]) => (
              <Text key={agent} color={theme.colors.white}>
                - {agent} → <Text color={theme.colors.success}>{formatModelName(model, 35)}</Text>
              </Text>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Save Status */}
      {state.saveStatus === 'saving' && (
        <Text color={theme.colors.primary} bold>
          ⏳ {state.loadingMessage || 'Guardando configuración...'}
        </Text>
      )}

      {state.saveStatus === 'error' && (
        <Box flexDirection="column">
          <Text color={theme.colors.error} bold>
            {theme.icons.error} Error al guardar la configuración:
          </Text>
          <Text color={theme.colors.white} marginY={1}>
            {state.error}
          </Text>
          <Text color={theme.colors.gray}>
            (Presiona r para reintentar)
          </Text>
        </Box>
      )}

      {state.saveStatus === 'success' && (
        <Box flexDirection="column">
          <Text color={theme.colors.success} bold>
            {theme.icons.success} ¡Todo listo! Tu entorno de easy-code ha sido inicializado.
          </Text>
          
          {tailscaleChecked && !tailscaleIp && (
            <Box borderStyle="round" borderColor="yellow" paddingX={1} marginY={1}>
              <Text color={theme.colors.warning}>
                ⚠️ No se ha detectado una IP activa de Tailscale. easy-code funcionará en modo local.
                Recuerda activar Tailscale si vas a enlazar múltiples nodos.
              </Text>
            </Box>
          )}

          {tailscaleIp && (
            <Text color={theme.colors.primary} marginY={1}>
              ℹ Tailscale IP detectada: {tailscaleIp}
            </Text>
          )}

          <Text color={theme.colors.white} marginTop={1} bold>
            Presiona [Enter] para salir de la instalación.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SaveScreen;
