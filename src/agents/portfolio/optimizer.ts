// src/agents/portfolio/optimizer.ts
import { EnrichedModel } from '../../registry/hf/types.js';

export interface AgentAssignment {
  agent: string;
  models: EnrichedModel[]; // Sorted by score descending
  selectedModelId?: string;
}

export class PortfolioOptimizer {
  private availableVramGb: number;

  constructor(availableVramGb: number) {
    this.availableVramGb = availableVramGb;
  }

  /**
   * Optimizes the assignment of models to agents to avoid VRAM overflow 
   * and reuse models that are "good enough" for multiple agents.
   */
  public optimize(assignments: AgentAssignment[]): AgentAssignment[] {
    // 1. Group by best models to see overlaps
    const bestModelCounts: Record<string, number> = {};
    for (const assignment of assignments) {
      const best = assignment.models[0];
      if (best) {
        bestModelCounts[best.id] = (bestModelCounts[best.id] || 0) + 1;
      }
    }

    let currentVramUsed = 0;
    const finalAssignments: AgentAssignment[] = [];
    const loadedModels = new Set<string>();

    for (const assignment of assignments) {
      const models = assignment.models;
      let selectedModelId: string | undefined = undefined;

      // Intentar primero reusar un modelo que ya haya sido cargado si está en el top 3
      for (let i = 0; i < Math.min(3, models.length); i++) {
        const candidate = models[i];
        if (loadedModels.has(candidate.id)) {
          // Ya está cargado, costo en VRAM es 0 (para este nodo)
          selectedModelId = candidate.id;
          break;
        }
      }

      // Si no se pudo reusar, intentar cargar el mejor que quepa
      if (!selectedModelId) {
        for (const candidate of models) {
          const cost = typeof candidate.memory_required_gb === 'number' ? candidate.memory_required_gb : 0;
          if (currentVramUsed + cost <= this.availableVramGb) {
            selectedModelId = candidate.id;
            loadedModels.add(candidate.id);
            currentVramUsed += cost;
            break;
          }
        }
      }

      // Si aún no caben, fallback drástico: reusar cualquiera que esté cargado aunque no sea top 3
      if (!selectedModelId && loadedModels.size > 0) {
        // Encontrar el cargado que tenga mejor score relativo (aparezca más alto en la lista de models)
        for (const candidate of models) {
          if (loadedModels.has(candidate.id)) {
            selectedModelId = candidate.id;
            break;
          }
        }
      }

      finalAssignments.push({
        ...assignment,
        selectedModelId: selectedModelId || (models[0]?.id) // Fallback al 0 si falla todo (causará OOM, pero llmfit ya debió haber filtrado por fit=good)
      });
    }

    return finalAssignments;
  }
}
