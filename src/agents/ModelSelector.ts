// src/agents/ModelSelector.ts
import { LlmfitClient } from '../registry/llmfit/client.js';
import { ModelDescriptor } from '../compatibility/types.js';
import type { AgentProfile, CognitiveProfile } from './types.js';
import fs from 'fs/promises';
import path from 'path';

import { HFClient } from '../registry/hf/client.js';
import { extractFeatures } from './scoring/extractor.js';
import { calculateScore } from './scoring/engine.js';
import { normalizeModelName } from '../registry/hf/normalizer.js';

export type SelectorProfile = 'FAST' | 'BALANCED' | 'QUALITY' | 'CODING';

const LEGACY_FILTERS_ENABLED = true;

export interface SelectionTrace {
  agent: string;
  profileUsed: SelectorProfile | CognitiveProfile;
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
  
  legacyModel?: string;
  newModel?: string;
  divergenceScore?: number;
}

export class ModelSelector {
  private client: LlmfitClient;
  private hfClient: HFClient;
  private traces: SelectionTrace[] = [];
  private hardwareProfile: any = null;

  constructor(client: LlmfitClient = new LlmfitClient(), hfClient?: HFClient, hfToken?: string) {
    this.client = client;
    this.hfClient = hfClient || new HFClient(undefined, hfToken);
  }

  setHardwareProfile(profile: any) {
    this.hardwareProfile = profile;
  }

  getAgentProfile(agent: AgentProfile): CognitiveProfile {
    switch (agent) {
      case 'phase-init':
      case 'phase-explore':
        return 'EXPLORER';
      case 'agentic-orchestrator':
        return 'ORCHESTRATOR';
      case 'phase-propose':
      case 'phase-spec':
        return 'PLANNER';
      case 'phase-design':
        return 'ARCHITECT';
      case 'phase-apply':
      case 'consensus-judge-a':
      case 'consensus-judge-b':
      case 'consensus-fixer':
        return 'CODER';
      case 'phase-verify':
        return 'VALIDATOR';
      case 'phase-tasks':
      case 'phase-onboard':
        return 'LIGHTWEIGHT';
      case 'phase-archive':
        return 'SECRETARY';
      default:
        return 'LIGHTWEIGHT';
    }
  }

  getLegacyAgentProfile(agent: AgentProfile): SelectorProfile {
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

  /**
   * @deprecated Usado únicamente en Shadow Mode legacy
   */
  getProfileFilters(profile: SelectorProfile): Record<string, any> {
    switch (profile) {
      case 'FAST':
        return { sort: 'tps', min_fit: 'good', include_too_tight: false, top_only: true };
      case 'BALANCED':
        return { sort: 'score', min_fit: 'good', include_too_tight: false, top_only: true };
      case 'QUALITY':
        return { sort: 'score', min_fit: 'good', include_too_tight: false, top_only: true };
      case 'CODING':
        return { use_case: 'Coding', sort: 'score' };
    }
  }

  private lastQuerySent: string = '';
  private lastFiltersApplied: Record<string, any> = {};

  async getLegacyCandidatesForAgent(agent: AgentProfile): Promise<ModelDescriptor[]> {
    const profile = this.getLegacyAgentProfile(agent);
    let filtersApplied = this.getProfileFilters(profile);
    const baseFilters = { ...filtersApplied };
    let querySent = '';

    const runQuery = async (filters: Record<string, any>) => {
      const queryParams = new URLSearchParams();
      for (const [key, val] of Object.entries(filters)) {
        queryParams.append(key, String(val));
      }
      querySent = `/api/v1/models/top?${queryParams.toString()}`;
      return this.client.getModels(filters);
    };

    let models = await runQuery(filtersApplied);

    if (models.length === 0 && profile === 'CODING') {
      filtersApplied = { ...baseFilters, use_case: 'General Purpose' };
      models = await runQuery(filtersApplied);
    }
    if (models.length === 0 && filtersApplied.use_case) {
      const { use_case, ...rest } = filtersApplied;
      filtersApplied = rest;
      models = await runQuery(filtersApplied);
    }
    if (models.length === 0 && filtersApplied.min_fit === 'good') {
      filtersApplied = { ...filtersApplied, min_fit: 'fair' };
      models = await runQuery(filtersApplied);
    }
    if (models.length === 0 && filtersApplied.min_fit) {
      const { min_fit, ...rest } = filtersApplied;
      filtersApplied = rest;
      models = await runQuery(filtersApplied);
    }

    return models;
  }

  async getCandidatesFromLlmfitHardFilters(): Promise<ModelDescriptor[]> {
    const filters = {
      sort: 'score',
      min_fit: 'marginal',
      include_too_tight: false,
      top_only: true,
      limit: 100
    };
    
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      queryParams.append(key, String(val));
    }
    this.lastQuerySent = `/api/v1/models/top?${queryParams.toString()}`;
    this.lastFiltersApplied = filters;

    return this.client.getModels(filters);
  }

  async getCandidatesForAgent(agent: AgentProfile): Promise<ModelDescriptor[]> {
    const cognitiveProfile = this.getAgentProfile(agent);
    const candidates = await this.getCandidatesFromLlmfitHardFilters();

    if (candidates.length === 0) {
      throw new Error(`[ModelSelector] Error: No se encontraron candidatos de llmfit para el pool inicial.`);
    }

    const scoredModels = await Promise.all(candidates.map(async (llmfitModel) => {
      const canonical = normalizeModelName(llmfitModel.name);
      const hfMeta = await this.hfClient.getModelMetadata(canonical.canonicalId);
      const enriched = extractFeatures(llmfitModel, canonical, hfMeta);
      const score = calculateScore(enriched, cognitiveProfile);
      return { model: llmfitModel, enriched, finalScore: score };
    }));

    scoredModels.sort((a, b) => b.finalScore - a.finalScore);
    return scoredModels.map(s => ({ ...s.model, score: s.finalScore }));
  }

  async selectModelForAgent(agent: AgentProfile): Promise<ModelDescriptor> {
    const cognitiveProfile = this.getAgentProfile(agent);
    console.log(`[ModelSelector] Iniciando selección NEW MODE para el agente: [${agent}] con perfil: [${cognitiveProfile}]`);

    const startTime = Date.now();
    
    // We fetch candidates using the new scoring logic
    const sortedCandidates = await this.getCandidatesForAgent(agent);
    const selectedNew = sortedCandidates[0];
    
    let legacySelected: ModelDescriptor | undefined;

    if (LEGACY_FILTERS_ENABLED) {
      const legacyProfile = this.getLegacyAgentProfile(agent);
      console.log(`[ModelSelector] Ejecutando SHADOW MODE (Legacy) para el agente: [${agent}] con perfil: [${legacyProfile}]`);
      try {
        const legacyCandidates = await this.getLegacyCandidatesForAgent(agent);
        if (legacyCandidates.length > 0) {
          legacySelected = legacyCandidates[0];
        }
      } catch (err) {
        console.warn(`[ModelSelector] Shadow Mode Legacy falló para ${agent}:`, err);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ModelSelector] Modelo elegido: [${selectedNew.name}] en ${elapsed}ms`);

    let divergenceScore = 0;
    if (legacySelected && legacySelected.name !== selectedNew.name) {
      divergenceScore = 1;
      console.warn(`[SHADOW DIVERGENCE] Agente: ${agent} | OLD: ${legacySelected.name} | NEW: ${selectedNew.name}`);
    }

    const trace: SelectionTrace = {
      agent,
      profileUsed: cognitiveProfile,
      hardwareDetected: this.hardwareProfile || 'Unknown',
      querySent: this.lastQuerySent,
      filtersApplied: this.lastFiltersApplied,
      candidatesCount: sortedCandidates.length,
      modelSelected: selectedNew.name,
      score: selectedNew.score || 0,
      scoreComponents: selectedNew.score_components || null,
      estimatedTps: selectedNew.estimated_tps || 0,
      fitLevel: selectedNew.fit_level || 'Unknown',
      context: selectedNew.contextWindow || 0,
      memoryUsed: selectedNew.memory_required_gb || selectedNew.sizeGb,
      quantizationChosen: selectedNew.quant || 'Unknown',
      timestamp: new Date().toISOString(),
      legacyModel: legacySelected?.name,
      newModel: selectedNew.name,
      divergenceScore
    };

    this.traces.push(trace);
    await this.saveTraces();

    return selectedNew;
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
