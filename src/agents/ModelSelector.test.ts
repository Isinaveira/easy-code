// src/agents/ModelSelector.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ModelSelector } from './ModelSelector.js';
import { LlmfitClient } from '../registry/llmfit/client.js';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('ModelSelector', () => {
  let mockClient: LlmfitClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getModels: vi.fn()
    } as unknown as LlmfitClient;
  });

  describe('Profile Mappings', () => {
    it('should map agent to the correct profile', () => {
      const selector = new ModelSelector(mockClient);
      
      expect(selector.getAgentProfile('phase-init')).toBe('FAST');
      expect(selector.getAgentProfile('phase-explore')).toBe('FAST');
      expect(selector.getAgentProfile('phase-archive')).toBe('FAST');

      expect(selector.getAgentProfile('phase-tasks')).toBe('BALANCED');
      expect(selector.getAgentProfile('phase-verify')).toBe('BALANCED');
      expect(selector.getAgentProfile('phase-onboard')).toBe('BALANCED');

      expect(selector.getAgentProfile('agentic-orchestrator')).toBe('QUALITY');
      expect(selector.getAgentProfile('phase-propose')).toBe('QUALITY');
      expect(selector.getAgentProfile('phase-spec')).toBe('QUALITY');
      expect(selector.getAgentProfile('phase-design')).toBe('QUALITY');

      expect(selector.getAgentProfile('phase-apply')).toBe('CODING');
      expect(selector.getAgentProfile('consensus-judge-a')).toBe('CODING');
      expect(selector.getAgentProfile('consensus-judge-b')).toBe('CODING');
      expect(selector.getAgentProfile('consensus-fixer')).toBe('CODING');
    });

    it('should map profile to correct query filters', () => {
      const selector = new ModelSelector(mockClient);

      expect(selector.getProfileFilters('FAST')).toEqual({
        sort: 'speed',
        min_fit: 'good',
        include_too_tight: false,
        top_only: true
      });

      expect(selector.getProfileFilters('BALANCED')).toEqual({
        sort: 'score',
        min_fit: 'good',
        include_too_tight: false,
        top_only: true
      });

      expect(selector.getProfileFilters('QUALITY')).toEqual({
        sort: 'quality',
        min_fit: 'good',
        include_too_tight: false,
        top_only: true
      });

      expect(selector.getProfileFilters('CODING')).toEqual({
        use_case: 'Coding',
        sort: 'score'
      });
    });
  });

  describe('Model Selection & Fallbacks', () => {
    it('should return the first candidate on successful initial query', async () => {
      const selector = new ModelSelector(mockClient);
      const mockModel = {
        name: 'qwen2.5:7b',
        sizeGb: 4.8,
        score: 95.0,
        score_components: { context: 100, fit: 100, quality: 90, speed: 90 },
        estimated_tps: 35.5,
        fit_level: 'Good',
        memory_required_gb: 8.5,
        contextWindow: 16384,
        quant: 'Q4_K_M'
      };

      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-init');

      expect(result).toEqual(mockModel);
      expect(mockClient.getModels).toHaveBeenCalledTimes(1);
      expect(mockClient.getModels).toHaveBeenCalledWith({
        sort: 'speed',
        min_fit: 'good',
        include_too_tight: false,
        top_only: true
      });

      // Verify that trace was saved
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse((fs.writeFile as any).mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].agent).toBe('phase-init');
      expect(writtenData[0].modelSelected).toBe('qwen2.5:7b');
      expect(writtenData[0].fitLevel).toBe('Good');
    });

    it('should fallback to General Purpose use_case if CODING agent query returns 0 candidates', async () => {
      const selector = new ModelSelector(mockClient);
      const mockModel = {
        name: 'llama3:8b',
        sizeGb: 4.8,
        score: 92.0
      };

      // CODING first query returns empty array
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // CODING fallback to General Purpose returns the model
      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-apply');

      expect(result).toEqual(mockModel);
      expect(mockClient.getModels).toHaveBeenCalledTimes(2);
      expect(mockClient.getModels).toHaveBeenNthCalledWith(1, {
        use_case: 'Coding',
        sort: 'score'
      });
      expect(mockClient.getModels).toHaveBeenNthCalledWith(2, {
        use_case: 'General Purpose',
        sort: 'score'
      });
    });

    it('should drop use_case completely if use_case filters yield 0 candidates', async () => {
      const selector = new ModelSelector(mockClient);
      const mockModel = {
        name: 'mistral:7b',
        sizeGb: 4.2
      };

      // 1. Coding query -> empty
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // 2. General Purpose query -> empty
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // 3. Drop use_case -> returns model
      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-apply');

      expect(result).toEqual(mockModel);
      expect(mockClient.getModels).toHaveBeenCalledTimes(3);
      expect(mockClient.getModels).toHaveBeenNthCalledWith(3, {
        sort: 'score'
      });
    });

    it('should fallback min_fit from good to fair if initial queries return 0 candidates', async () => {
      const selector = new ModelSelector(mockClient);
      const mockModel = {
        name: 'deepseek-coder:1.3b',
        sizeGb: 1.0
      };

      // 1. Initial (min_fit: good) -> empty
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // 2. Fallback 3 (min_fit: fair) -> returns model
      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-tasks');

      expect(result).toEqual(mockModel);
      expect(mockClient.getModels).toHaveBeenCalledTimes(2);
      expect(mockClient.getModels).toHaveBeenNthCalledWith(1, {
        sort: 'score',
        min_fit: 'good',
        include_too_tight: false,
        top_only: true
      });
      expect(mockClient.getModels).toHaveBeenNthCalledWith(2, {
        sort: 'score',
        min_fit: 'fair',
        include_too_tight: false,
        top_only: true
      });
    });

    it('should remove min_fit filter entirely if min_fit: fair still yields 0 candidates', async () => {
      const selector = new ModelSelector(mockClient);
      const mockModel = {
        name: 'phi3:mini',
        sizeGb: 2.2
      };

      // 1. Initial (min_fit: good) -> empty
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // 2. Fallback 3 (min_fit: fair) -> empty
      (mockClient.getModels as any).mockResolvedValueOnce([]);
      // 3. Fallback 4 (remove min_fit) -> returns model
      (mockClient.getModels as any).mockResolvedValueOnce([mockModel]);

      const result = await selector.selectModelForAgent('phase-tasks');

      expect(result).toEqual(mockModel);
      expect(mockClient.getModels).toHaveBeenCalledTimes(3);
      expect(mockClient.getModels).toHaveBeenNthCalledWith(3, {
        sort: 'score',
        include_too_tight: false,
        top_only: true
      });
    });

    it('should throw error if all fallback attempts yield 0 candidates', async () => {
      const selector = new ModelSelector(mockClient);

      (mockClient.getModels as any).mockResolvedValue([]);

      await expect(selector.selectModelForAgent('phase-tasks')).rejects.toThrow(
        '[ModelSelector] Error: No se encontraron candidatos compatibles para el agente [phase-tasks].'
      );
    });
  });
});
