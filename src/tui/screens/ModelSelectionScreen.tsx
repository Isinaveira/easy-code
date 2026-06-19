// src/tui/screens/ModelSelectionScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState } from '../providers/AppStateProvider.js';
import { AGENT_REQUIREMENTS_MAP, AgentProfile } from '../../agents/index.js';
import theme from '../theme/index.js';

function cleanModelName(name: string): string {
  const parts = name.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : name;
}

function formatContextLimit(ctx: number): string {
  if (ctx >= 1000000) {
    const val = ctx / 1000000;
    return val % 1 === 0 ? `${val.toFixed(0)}M` : `${val.toFixed(1)}M`;
  }
  if (ctx >= 1000) {
    const val = ctx / 1000;
    return val % 1 === 0 ? `${val.toFixed(0)}K` : `${val.toFixed(1)}K`;
  }
  return String(ctx);
}

const modeloWidth = 36;
const paramsWidth = 9;
const scoreWidth = 8;
const memWidth = 10;
const ctxWidth = 11;
const tpsWidth = 7;

function formatRow(
  modelo: string,
  params: any,
  score: any,
  memoria: any,
  contexto: any,
  tps: any
): string {
  const modeloCol = cleanModelName(String(modelo)).slice(0, modeloWidth).padEnd(modeloWidth);
  const paramsCol = String(params).padEnd(paramsWidth);
  const scoreCol = String(score).padEnd(scoreWidth);
  const memoriaCol = String(memoria).padEnd(memWidth);
  const contextoCol = String(contexto).padEnd(ctxWidth);
  const tpsCol = String(tps).padEnd(tpsWidth);
  return `${modeloCol}${paramsCol}${scoreCol}${memoriaCol}${contextoCol}${tpsCol}`;
}

export const ModelSelectionScreen: React.FC = () => {
  const { state, dispatch } = useAppState();

  // Scrolling and inspection states
  const [modelIndex, setModelIndex] = useState(0);
  const [modelScrollOffset, setModelScrollOffset] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const visibleCount = 10;

  const agent = state.selectedAgents[state.currentAgentIndex] as AgentProfile | undefined;

  const getCompatibleModels = (currentAgent: AgentProfile) => {
    const reqs = AGENT_REQUIREMENTS_MAP[currentAgent];
    const agentModels = state.availableModelsByAgent?.[currentAgent] || [];
    return agentModels
      .filter((m) => m.sizeGb <= state.detectedVram)
      .sort((a, b) => {
        const scoreA = a.score || a.metrics[reqs.priorityMetric] || 50;
        const scoreB = b.score || b.metrics[reqs.priorityMetric] || 50;
        return scoreB - scoreA;
      });
  };

  useInput((input, key) => {
    if (isInspecting) {
      setIsInspecting(false);
      return;
    }

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

    if (input === 'i') {
      setIsInspecting(true);
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

  const models = getCompatibleModels(agent);
  const hasNoModels = models.length === 0;

  const visibleModels = models.slice(modelScrollOffset, modelScrollOffset + visibleCount);
  const hasMoreAbove = modelScrollOffset > 0;
  const hasMoreBelow = modelScrollOffset + visibleCount < models.length;

  // Build Hardware Profile strings
  const hw = state.hardwareProfile;
  let cpuStr = 'N/A';
  let gpuStr = 'N/A';
  let ramStr = 'N/A';
  
  if (hw) {
    if (hw.cpu) {
      const cleanCpuModel = (hw.cpu.model || '').trim().replace(/\s+/g, ' ');
      cpuStr = `${cleanCpuModel} (${hw.cpu.cores || 0} Cores / ${(hw.cpu.cores || 0) * 2} Threads)`;
    }
    if (hw.gpu) {
      const cleanGpuModel = (hw.gpu.model || '').trim().replace(/\s+/g, ' ');
      const vendor = hw.gpu.vendor || '';
      const vendorPrefix = vendor && cleanGpuModel.toLowerCase().includes(vendor.toLowerCase()) 
        ? '' 
        : (vendor ? `${vendor.toUpperCase()} ` : '');
      gpuStr = `${vendorPrefix}${cleanGpuModel} (${(hw.gpu.vramGb || 0).toFixed(1)} GB VRAM)`;
    } else {
      gpuStr = 'Integrated Graphics';
    }
    if (hw.memory) {
      ramStr = `RAM Usable: ${(hw.memory.totalGb || 0).toFixed(1)} GB`;
    }
  }

  // Inspection View rendering
  if (isInspecting && models[modelIndex]) {
    const m = models[modelIndex];
    const name = m.name;
    const params = m.parameter_count || m.params || 'N/A';
    const paramsB = typeof m.params_b === 'number' ? `${m.params_b.toFixed(1)}B` : 'N/A';
    const isMoe = m.is_moe ? 'Sí' : 'No';
    const category = m.category || 'N/A';
    const provider = m.provider || 'N/A';
    const license = m.license || 'N/A';
    const releaseDate = m.release_date || 'N/A';

    const bestQuant = m.best_quant || 'N/A';

    const memReq = typeof m.memory_required_gb === 'number' ? `${m.memory_required_gb.toFixed(1)} GB` : (typeof m.sizeGb === 'number' ? `${m.sizeGb.toFixed(1)} GB` : 'N/A');
    const totalMem = typeof m.total_memory_gb === 'number' ? `${m.total_memory_gb.toFixed(1)} GB` : 'N/A';
    const utilPct = m.utilization_pct ? `${m.utilization_pct}%` : 'N/A';
    const memAvailable = typeof m.memory_available_gb === 'number' ? `${m.memory_available_gb.toFixed(1)} GB` : 'N/A';
    const moeOffloaded = typeof m.moe_offloaded_gb === 'number' ? `${m.moe_offloaded_gb.toFixed(1)} GB` : 'N/A';

    const ctx = m.context_length || m.contextWindow || 'N/A';
    const useCase = m.use_case || m.use || 'N/A';

    let caps = 'Ninguna específica';
    if (Array.isArray(m.capabilities) && m.capabilities.length > 0) {
      caps = m.capabilities.join(', ');
    }
    const supportsTp = Array.isArray(m.supports_tp) ? m.supports_tp.join(', ') : 'N/A';

    const score = typeof m.score === 'number' ? m.score.toFixed(1) : 'N/A';
    
    let scoreContext = 'N/A';
    let scoreQuality = 'N/A';
    let scoreSpeed = 'N/A';
    let scoreFit = 'N/A';
    
    if (m.score_components) {
      scoreContext = typeof m.score_components.context === 'number' ? String(m.score_components.context) : 'N/A';
      scoreQuality = typeof m.score_components.quality === 'number' ? String(m.score_components.quality) : 'N/A';
      scoreSpeed = typeof m.score_components.speed === 'number' ? String(m.score_components.speed) : 'N/A';
      scoreFit = typeof m.score_components.fit === 'number' ? String(m.score_components.fit) : 'N/A';
    }
    
    const runtime = m.runtime || 'N/A';
    const runtimeLabel = m.runtime_label || m.runtime || 'N/A';
    const runMode = m.run_mode || 'N/A';
    const runModeLabel = m.run_mode_label || m.run_mode || 'N/A';
    
    const notes = Array.isArray(m.notes) ? m.notes : [];
    const ggufSources = Array.isArray(m.gguf_sources) ? m.gguf_sources : [];

    return (
      <Box flexDirection="column" marginY={1}>
        <Text color={theme.colors.secondary} bold>📋 TELEMETRÍA DETALLADA: [{name}]</Text>
        <Text color={theme.colors.gray}>--------------------------------------------------------------------------------</Text>
        <Text color={theme.colors.white}>• Arquitectura        : {params} ({paramsB}) | MoE: {isMoe} | Categoría: {category} | Proveedor: {provider} | Licencia: {license} | Lanzamiento: {releaseDate}</Text>
        <Text color={theme.colors.white}>• Cuantización Óptima : {bestQuant} (Sugerido por hardware)</Text>
        <Text color={theme.colors.white}>• Uso de Memoria      : Requiere {memReq} (Total: {totalMem}) | Ocupará el {utilPct} del sistema (Disponible: {memAvailable}) | MoE Offload: {moeOffloaded}</Text>
        <Text color={theme.colors.white}>• Contexto Nativo     : {ctx} tokens | Caso de Uso: {useCase}</Text>
        <Text color={theme.colors.white}>• Capacidades Nativas : {caps} | Tensor Parallelism (TP): {supportsTp}</Text>
        <Text color={theme.colors.white}>• Desglose de Score   : Global {score} / 100</Text>
        <Text color={theme.colors.gray}>  ├── Contexto: {scoreContext} | Calidad: {scoreQuality} | Velocidad: {scoreSpeed} | Ajuste: {scoreFit}</Text>
        <Text color={theme.colors.white}>• Runtime Estimado    : {runtimeLabel} ({runtime}) vía {runModeLabel} ({runMode})</Text>
        
        {notes.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.white}>• Notas del Motor     :</Text>
            {notes.map((note, i) => (
              <Text key={i} color={theme.colors.gray}>  - {note}</Text>
            ))}
          </Box>
        )}
        
        {ggufSources.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.white}>• Fuentes (GGUF)      :</Text>
            {ggufSources.map((src, i) => {
              const displaySrc = src.provider && src.repo ? `${src.provider}/${src.repo}` : 'N/A';
              return (
                <Text key={i} color={theme.colors.gray}>  - {displaySrc}</Text>
              );
            })}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color={theme.colors.primary} bold>[ Volver a la lista presionando cualquier tecla ]</Text>
        </Box>
      </Box>
    );
  }

  const tableHeader = `  ` + formatRow('MODELO', 'PARAMS', 'SCORE', 'MEMORIA', 'CONTEXTO', 'TPS') + 'FIT';

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Block 1: Node hardware configuration */}
      <Box flexDirection="column">
        <Text color={theme.colors.white} bold>⚙️ CONFIGURACIÓN DE NODO: [{state.nodeName}]</Text>
        <Text color={theme.colors.white}>💻 Hardware: {cpuStr} | {gpuStr} | {ramStr}</Text>
        <Text color={theme.colors.gray}>-------------------------------------------------------------------------------------------------------</Text>
      </Box>

      {/* Block 2: Agent requirements */}
      <Box flexDirection="column" marginY={1}>
        <Text color={theme.colors.secondary} bold>
          🤖 Configurando Agente: {agent} ({state.currentAgentIndex + 1}/{state.selectedAgents.length})
        </Text>
        <Text color={theme.colors.white}>   • Min. Contexto : {reqs.minContextWindow} tokens</Text>
        <Text color={theme.colors.white}>   • Habilidades   : {minCaps}</Text>
      </Box>

      {/* Block 3: Interactive Table */}
      <Box marginBottom={1}>
        <Text color={theme.colors.white} bold>
          Selecciona modelo para {agent}:
        </Text>
      </Box>

      {hasNoModels ? (
        <Box flexDirection="column">
          <Text color={theme.colors.error} bold>
            ⚠️ No compatible models found. Insufficient hardware for this agent.
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
              {tableHeader}
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
            
            const isPerfect = m.fit_level?.toLowerCase() === 'perfect' || m.fit_label?.toLowerCase() === 'perfect';
            const isGood = m.fit_level?.toLowerCase() === 'good' || m.fit_label?.toLowerCase() === 'good';
            
            const fitIndicator = isPerfect ? '✔ ' : '';
            const fitText = isPerfect ? 'Perfect' : (isGood ? 'Good' : 'N/A');
            const runMode = m.run_mode_label || m.run_mode || 'GPU';
            
            const fitLabel = `${fitIndicator}${fitText} (${runMode.toUpperCase()})`;
            const fitColor = isPerfect ? theme.colors.success : (isGood ? theme.colors.warning : theme.colors.white);

            const rowText = formatRow(
              m.name,
              m.parameter_count || m.params || 'N/A',
              (typeof m.score === 'number' ? m.score.toFixed(1) : 'N/A'),
              (typeof m.memory_required_gb === 'number' ? `${m.memory_required_gb.toFixed(1)} GB` : 'N/A'),
              formatContextLimit(m.context_length || m.contextWindow || 0),
              (typeof m.estimated_tps === 'number' ? m.estimated_tps.toFixed(1) : '0.0')
            );

            return (
              <Box key={m.name} paddingLeft={2} flexDirection="row">
                <Text color={isSelected ? theme.colors.primary : theme.colors.white} bold={isSelected}>
                  {isSelected ? '> ' : '  '}
                  {rowText}
                </Text>
                <Text color={fitColor}>
                  {fitLabel}
                </Text>
              </Box>
            );
          })}

          {hasMoreBelow && (
            <Box paddingLeft={4}>
              <Text color={theme.colors.primary}>▼ ({models.length - (modelScrollOffset + visibleCount)} más abajo)</Text>
            </Box>
          )}

          <Box marginTop={1} flexDirection="column">
            <Text color={theme.colors.cyan}>
              [🔍 Presiona 'i' para ver telemetría detallada (Cuantización, MoE, Fuentes...)]
            </Text>
            <Text color={theme.colors.gray} marginTop={1}>
              (Usa ↑/↓ para navegar, Enter para confirmar, Esc/b para volver al agente anterior)
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ModelSelectionScreen;
