// src/agents/ModelSelector.ts
import { LlmfitClient } from '../registry/llmfit/client.js';
import { ModelDescriptor } from '../compatibility/types.js';
import type { AgentProfile } from './types.js';
import fs from 'fs/promises';
import path from 'path';

export type SelectorProfile = 'FAST' | 'BALANCED' | 'QUALITY' | 'CODING';

export interface SelectionTrace {
  agent: string;
  profileUsed: SelectorProfile;
  hardwareDetected: any;
  querySent: string;
  filtersApplied: Record<string, any>;
  candidatesCount: number;
  modelSelected: string;
  score: number;
  scoreComponents: any;
  estimatedTps: number;
  fitLevel: string;
  context: number;
  memoryUsed: number;
  quantizationChosen: string;
  timestamp: string;
}

export class ModelSelector {
  private client: LlmfitClient;
  private traces: SelectionTrace[] = [];
  private hardwareProfile: any = null;

  constructor(client: LlmfitClient = new LlmfitClient()) {
    this.client = client;
  }

  setHardwareProfile(profile: any) {
    this.hardwareProfile = profile;
  }

  getAgentProfile(agent: AgentProfile): SelectorProfile {
    switch (agent) {
      case 'phase-init':
      case 'phase-explore':
      case 'phase-archive':
        return 'FAST';
      case 'phase-tasks':
      case 'phase-verify':
      case 'phase-onboard':
        return 'BALANCED';
      case 'agentic-orchestrator':
      case 'phase-propose':
      case 'phase-spec':
      case 'phase-design':
        return 'QUALITY';
      case 'phase-apply':
      case 'consensus-judge-a':
      case 'consensus-judge-b':
      case 'consensus-fixer':
        return 'CODING';
      default:
        return 'BALANCED';
    }
  }

  getProfileFilters(profile: SelectorProfile): Record<string, any> {
    switch (profile) {
      case 'FAST':
        return {
          sort: 'speed',
          min_fit: 'good',
          include_too_tight: false,
          top_only: true
        };
      case 'BALANCED':
        return {
          sort: 'score',
          min_fit: 'good',
          include_too_tight: false,
          top_only: true
        };
      case 'QUALITY':
        return {
          sort: 'quality',
          min_fit: 'good',
          include_too_tight: false,
          top_only: true
        };
      case 'CODING':
        return {
          use_case: 'Coding',
          sort: 'score'
        };
    }
  }

  private lastQuerySent: string = '';
  private lastFiltersApplied: Record<string, any> = {};

  async getCandidatesForAgent(agent: AgentProfile): Promise<ModelDescriptor[]> {
    const profile = this.getAgentProfile(agent);
    const baseFilters = this.getProfileFilters(profile);
    
    console.log(`[ModelSelector] Buscando candidatos para el agente: [${agent}] con perfil: [${profile}]`);

    let models: ModelDescriptor[] = [];
    let querySent = '';
    let filtersApplied = { ...baseFilters };

    const runQuery = async (filters: Record<string, any>) => {
      const queryParams = new URLSearchParams();
      for (const [key, val] of Object.entries(filters)) {
        queryParams.append(key, String(val));
      }
      querySent = `/api/v1/models?${queryParams.toString()}`;
      console.log(`[ModelSelector] Enviando consulta a llmfit: ${querySent}`);
      return this.client.getModels(filters);
    };

    // 1. Initial query execution
    models = await runQuery(filtersApplied);
    console.log(`[ModelSelector] Respuesta recibida: ${models.length} candidatos encontrados.`);

    // Fallback Step 1: If CODING returns 0 results, query use_case = General Purpose
    if (models.length === 0 && profile === 'CODING') {
      console.warn(`[ModelSelector] 0 candidatos en CODING. Ejecutando fallback 1: use_case = 'General Purpose'`);
      filtersApplied = {
        ...baseFilters,
        use_case: 'General Purpose'
      };
      models = await runQuery(filtersApplied);
    }

    // Fallback Step 2: If still 0, completely remove use_case filter
    if (models.length === 0 && filtersApplied.use_case) {
      console.warn(`[ModelSelector] 0 candidatos con use_case. Ejecutando fallback 2: eliminando filtro use_case`);
      const { use_case, ...rest } = filtersApplied;
      filtersApplied = rest;
      models = await runQuery(filtersApplied);
    }

    // Fallback Step 3: If still 0, decrease min_fit to 'fair'
    if (models.length === 0 && filtersApplied.min_fit === 'good') {
      console.warn(`[ModelSelector] 0 candidatos con min_fit = 'good'. Ejecutando fallback 3: disminuyendo min_fit a 'fair'`);
      filtersApplied = {
        ...filtersApplied,
        min_fit: 'fair'
      };
      models = await runQuery(filtersApplied);
    }

    // Fallback Step 4: If still 0, remove min_fit filter
    if (models.length === 0 && filtersApplied.min_fit) {
      console.warn(`[ModelSelector] 0 candidatos. Ejecutando fallback 4: eliminando min_fit`);
      const { min_fit, ...rest } = filtersApplied;
      filtersApplied = rest;
      models = await runQuery(filtersApplied);
    }

    this.lastQuerySent = querySent;
    this.lastFiltersApplied = filtersApplied;

    return models;
  }

  async selectModelForAgent(agent: AgentProfile): Promise<ModelDescriptor> {
    const profile = this.getAgentProfile(agent);
    
    // Logging start of selection
    console.log(`[ModelSelector] Iniciando selección para el agente: [${agent}] con perfil: [${profile}]`);

    const startTime = Date.now();
    const models = await this.getCandidatesForAgent(agent);
    const elapsed = Date.now() - startTime;

    if (models.length === 0) {
      const errMsg = `[ModelSelector] Error: No se encontraron candidatos compatibles para el agente [${agent}].`;
      console.error(errMsg);
      throw new Error(errMsg);
    }

    const selected = models[0];
    console.log(`[ModelSelector] Modelo elegido: [${selected.name}] en ${elapsed}ms`);

    // Record selection trace log details
    const trace: SelectionTrace = {
      agent,
      profileUsed: profile,
      hardwareDetected: this.hardwareProfile || 'Unknown',
      querySent: this.lastQuerySent,
      filtersApplied: this.lastFiltersApplied,
      candidatesCount: models.length,
      modelSelected: selected.name,
      score: selected.score || 50,
      scoreComponents: selected.score_components || null,
      estimatedTps: selected.estimated_tps || 0,
      fitLevel: selected.fit_level || 'Unknown',
      context: selected.contextWindow || 0,
      memoryUsed: selected.memory_required_gb || selected.sizeGb,
      quantizationChosen: selected.quant || 'Unknown',
      timestamp: new Date().toISOString()
    };

    this.traces.push(trace);
    await this.saveTraces();

    return selected;
  }

  getTraces(): SelectionTrace[] {
    return this.traces;
  }

  private async saveTraces() {
    try {
      const tracePath = path.join(process.cwd(), 'easy-code-trace.json');
      await fs.writeFile(tracePath, JSON.stringify(this.traces, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ModelSelector] Error guardando archivo de trazabilidad:', err);
    }
  }
}
