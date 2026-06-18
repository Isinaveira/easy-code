// src/agents/selector.test.ts
import { describe, expect, it } from 'vitest';
import { selectBestModelForAgent, enrichModelDescriptor, AGENT_REQUIREMENTS_MAP } from './selector.js';
import type { CognitiveModelItem, Capability, OutputFormat } from './types.js';

describe('Intelligent Selector by Agent Profile', () => {
  const catalogoMercado: CognitiveModelItem[] = [
    {
      name: "advanced-reasoning:8b",
      sizeGb: 5.5,
      contextWindow: 16384,
      capabilities: ['tool-calling', 'reasoning'],
      supportedOutputFormats: ['json', 'text', 'markdown'],
      metrics: { reasoning: 95, coding: 80, speed: 60 }
    },
    {
      name: "fast-coder:14b",
      sizeGb: 9.0,
      contextWindow: 32768,
      capabilities: ['tool-calling', 'coding'],
      supportedOutputFormats: ['code', 'text', 'markdown'],
      metrics: { reasoning: 70, coding: 92, speed: 75 }
    }
  ];

  it('should choose reasoning expert model for agentic-orchestrator', () => {
    const model = selectBestModelForAgent({
      agentProfile: 'agentic-orchestrator',
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
        agentProfile: 'agentic-orchestrator',
        catalogo: catalogoMercado,
        availableVramGb: 4.0
      });
    }).toThrow('No model in the catalog satisfies the requirements for: agentic-orchestrator');
  });
});

describe('Output Format Matching', () => {
  const catalogWithFormats: CognitiveModelItem[] = [
    {
      name: "json-specialist:7b",
      sizeGb: 4.5,
      contextWindow: 16384,
      capabilities: ['json-mode', 'reasoning'],
      supportedOutputFormats: ['json', 'text'],
      metrics: { reasoning: 85, coding: 70, speed: 80 }
    },
    {
      name: "code-specialist:7b",
      sizeGb: 4.5,
      contextWindow: 16384,
      capabilities: ['reasoning', 'coding'],
      supportedOutputFormats: ['code', 'markdown', 'text'],
      metrics: { reasoning: 80, coding: 90, speed: 75 }
    },
    {
      name: "all-rounder:7b",
      sizeGb: 4.5,
      contextWindow: 16384,
      capabilities: ['json-mode', 'reasoning', 'coding'],
      supportedOutputFormats: ['json', 'code', 'markdown', 'text'],
      metrics: { reasoning: 75, coding: 75, speed: 85 }
    }
  ];

  it('should filter models by required output formats', () => {
    const model = selectBestModelForAgent({
      agentProfile: 'phase-spec',
      catalogo: catalogWithFormats,
      availableVramGb: 12.0
    });

    // phase-spec requires json-mode capability and json output format
    // json-specialist and all-rounder both qualify, json-specialist wins on reasoning
    expect(model.name).toBe('json-specialist:7b');
  });

  it('should accept models when agent has no output format requirements', () => {
    // phase-init has no specific output format requirements beyond 'text'
    const model = selectBestModelForAgent({
      agentProfile: 'phase-init',
      catalogo: catalogWithFormats,
      availableVramGb: 12.0
    });

    // All three models support 'text', speed priority → all-rounder wins
    expect(model.name).toBe('all-rounder:7b');
  });

  it('should reject models missing required output formats', () => {
    const limitedCatalog: CognitiveModelItem[] = [
      {
        name: "text-only:7b",
        sizeGb: 4.0,
        contextWindow: 16384,
        capabilities: ['json-mode', 'reasoning'],
        supportedOutputFormats: ['text'],
        metrics: { reasoning: 90, coding: 80, speed: 70 }
      }
    ];

    // phase-spec requires json output format, text-only doesn't support it
    expect(() => {
      selectBestModelForAgent({
        agentProfile: 'phase-spec',
        catalogo: limitedCatalog,
        availableVramGb: 12.0
      });
    }).toThrow('No model in the catalog satisfies the requirements for: phase-spec');
  });
});

describe('Capability Type Safety', () => {
  it('AGENT_REQUIREMENTS_MAP should have typed capabilities', () => {
    const reqs = AGENT_REQUIREMENTS_MAP['agentic-orchestrator'];

    expect(reqs.requiredCapabilities).toContain('tool-calling');
    expect(reqs.requiredCapabilities).toContain('reasoning');
    expect(reqs.outputFormats).toContain('json');
    expect(reqs.outputFormats).toContain('text');
  });

  it('AGENT_REQUIREMENTS_MAP should define all agent profiles', () => {
    const expectedProfiles = [
      'agentic-orchestrator', 'phase-init', 'phase-explore', 'phase-propose',
      'phase-spec', 'phase-design', 'phase-tasks', 'phase-apply',
      'phase-verify', 'phase-archive', 'phase-onboard',
      'consensus-judge-a', 'consensus-judge-b', 'consensus-fixer'
    ];

    for (const profile of expectedProfiles) {
      expect(AGENT_REQUIREMENTS_MAP).toHaveProperty(profile);
    }
  });
});

describe('enrichModelDescriptor', () => {
  it('should add supportedOutputFormats to enriched model', () => {
    const enriched = enrichModelDescriptor({ name: 'qwen2.5:7b', sizeGb: 4.7 });

    expect(enriched.supportedOutputFormats).toBeDefined();
    expect(Array.isArray(enriched.supportedOutputFormats)).toBe(true);
    expect(enriched.supportedOutputFormats.length).toBeGreaterThan(0);
  });

  it('should provide default output formats for unknown models', () => {
    const enriched = enrichModelDescriptor({ name: 'unknown-model:1b', sizeGb: 0.5 });

    expect(enriched.supportedOutputFormats).toBeDefined();
    expect(enriched.capabilities).toBeDefined();
    expect(enriched.contextWindow).toBe(4096);
  });

  it('should preserve original model descriptor fields', () => {
    const original = { name: 'llama3:8b', sizeGb: 5.0, description: 'Test model' };
    const enriched = enrichModelDescriptor(original);

    expect(enriched.name).toBe('llama3:8b');
    expect(enriched.sizeGb).toBe(5.0);
    expect(enriched.description).toBe('Test model');
  });
});
