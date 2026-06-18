// src/agents/selector.test.ts
import { describe, expect, it } from 'vitest';
import { selectBestModelForAgent } from './selector.js';
import { CognitiveModelItem } from './types.js';

describe('Intelligent Selector by Agent Profile', () => {
  const catalogoMercado: CognitiveModelItem[] = [
    { 
      name: "advanced-reasoning:8b", 
      sizeGb: 5.5, 
      contextWindow: 16384,
      capabilities: ["tool-calling", "reasoning"],
      metrics: { reasoning: 95, coding: 80, speed: 60 }
    },
    { 
      name: "fast-coder:14b", 
      sizeGb: 9.0, 
      contextWindow: 32768,
      capabilities: ["tool-calling"],
      metrics: { reasoning: 70, coding: 92, speed: 75 }
    }
  ];

  it('should choose reasoning expert model for gentle-orchestrator', () => {
    const model = selectBestModelForAgent({
      agentProfile: 'gentle-orchestrator',
      catalogo: catalogoMercado,
      availableVramGb: 12.0
    });

    expect(model.name).toBe('advanced-reasoning:8b');
  });

  it('should choose coding expert model for phase-apply', () => {
    const model = selectBestModelForAgent({
      agentProfile: 'phase-apply',
      catalogo: catalogoMercado,
      availableVramGb: 12.0
    });

    expect(model.name).toBe('fast-coder:14b');
  });

  it('should throw error if no model fits constraints', () => {
    expect(() => {
      selectBestModelForAgent({
        agentProfile: 'gentle-orchestrator',
        catalogo: catalogoMercado,
        availableVramGb: 4.0
      });
    }).toThrow('Ningún modelo del catálogo satisface los requisitos de: gentle-orchestrator');
  });
});
