// src/agents/ModelSelector.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ModelSelector } from './ModelSelector.js';
import { LlmfitClient } from '../registry/llmfit/client.js';
import { HFClient } from '../registry/hf/client.js';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('ModelSelector', () => {
  let mockClient: LlmfitClient;
  let mockHFClient: HFClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getModels: vi.fn()
    } as unknown as LlmfitClient;
    
    mockHFClient = {
      getModelMetadata: vi.fn().mockResolvedValue({
        id: 'mock/repo',
        tags: [],
        downloads: 0,
        likes: 0
      })
    } as unknown as HFClient;
  });

  describe('Profile Mappings', () => {
    it('should map agent to the correct cognitive profile', () => {
      const selector = new ModelSelector(mockClient, mockHFClient);
      
      expect(selector.getAgentProfile('phase-init')).toBe('EXPLORER');
      expect(selector.getAgentProfile('phase-explore')).toBe('EXPLORER');
      expect(selector.getAgentProfile('phase-archive')).toBe('SECRETARY');

      expect(selector.getAgentProfile('phase-tasks')).toBe('LIGHTWEIGHT');
      expect(selector.getAgentProfile('phase-verify')).toBe('VALIDATOR');
      expect(selector.getAgentProfile('phase-onboard')).toBe('LIGHTWEIGHT');

      expect(selector.getAgentProfile('agentic-orchestrator')).toBe('ORCHESTRATOR');
      expect(selector.getAgentProfile('phase-propose')).toBe('PLANNER');
      expect(selector.getAgentProfile('phase-spec')).toBe('PLANNER');
      expect(selector.getAgentProfile('phase-design')).toBe('ARCHITECT');

      expect(selector.getAgentProfile('phase-apply')).toBe('CODER');
      expect(selector.getAgentProfile('consensus-judge-a')).toBe('CODER');
      expect(selector.getAgentProfile('consensus-judge-b')).toBe('CODER');
      expect(selector.getAgentProfile('consensus-fixer')).toBe('CODER');
    });
  });

  describe('Model Selection (New Mode)', () => {
    it('should return the best candidate based on scoring', async () => {
      const selector = new ModelSelector(mockClient, mockHFClient);
      const mockModel = {
        name: 'qwen2.5:7b',
        sizeGb: 4.8,
        score: 95.0,
        estimated_tps: 35.5,
        fit_level: 'Good',
        memory_required_gb: 8.5,
        contextWindow: 16384,
        quant: 'Q4_K_M'
      };

      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-init');

      expect(result.name).toEqual(mockModel.name);
      expect(mockClient.getModels).toHaveBeenCalledTimes(2); // 1 from New Mode, 1 from Shadow Mode (Legacy)
      
      const newModeCall = (mockClient.getModels as any).mock.calls[0][0];
      expect(newModeCall).toEqual({
        sort: 'score',
        min_fit: 'marginal',
        include_too_tight: false,
        top_only: true,
        limit: 100
      });

      // Verify that trace was saved
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse((fs.writeFile as any).mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].agent).toBe('phase-init');
      expect(writtenData[0].modelSelected).toBe('qwen2.5:7b');
      expect(writtenData[0].fitLevel).toBe('Good');
    });

    it('should throw error if llmfit yields 0 candidates in hard filter', async () => {
      const selector = new ModelSelector(mockClient, mockHFClient);

      (mockClient.getModels as any).mockResolvedValue([]);

      await expect(selector.selectModelForAgent('phase-tasks')).rejects.toThrow(
        '[ModelSelector] Error: No se encontraron candidatos de llmfit para el pool inicial.'
      );
    });

    it('should return all candidates for getCandidatesForAgent', async () => {
      const selector = new ModelSelector(mockClient, mockHFClient);
      const mockModels = [
        { name: 'phi3:mini', sizeGb: 2.2 },
        { name: 'llama3:8b', sizeGb: 4.7 }
      ];

      (mockClient.getModels as any).mockResolvedValueOnce(mockModels);

      const result = await selector.getCandidatesForAgent('phase-init');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('phi3:mini');
      expect(result[0]).toHaveProperty('score'); // Enriched score
      expect(mockClient.getModels).toHaveBeenCalledTimes(1);
    });
  });
});
