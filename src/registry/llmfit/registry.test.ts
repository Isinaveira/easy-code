// src/registry/llmfit/registry.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LlmfitClient } from './client.js';
import { LlmfitRegistry } from './registry.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Llmfit Sub-Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LlmfitClient', () => {
    it('should return true for health check if response is ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const client = new LlmfitClient('http://localhost:8787');
      const healthy = await client.health();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/health', expect.any(Object));
      expect(healthy).toBe(true);
    });

    it('should return false for health check if response is not ok or throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const client = new LlmfitClient();
      const healthy = await client.health();

      expect(healthy).toBe(false);
    });

    it('should query models from correct URL and return parsed flat array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'llama3.1:8b', sizeGb: 4.8, description: 'Llama 3.1 model' },
          { name: 'qwen2.5:7b', sizeBytes: 5153960755, description: 'Qwen model' } // 4.8 GB
        ]
      });

      const client = new LlmfitClient('http://localhost:8787');
      const models = await client.getModels();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/v1/models', expect.any(Object));
      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({ name: 'llama3.1:8b', sizeGb: 4.8, description: 'Llama 3.1 model' });
      expect(models[1]).toEqual({ name: 'qwen2.5:7b', sizeGb: 4.8, description: 'Qwen model' });
    });

    it('should handle wrapped models payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'phi3:mini', size: 2.2, description: 'Phi3 model' }
          ]
        })
      });

      const client = new LlmfitClient();
      const models = await client.getModels();

      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({ name: 'phi3:mini', sizeGb: 2.2, description: 'Phi3 model' });
    });

    it('should fallback size parsing from name when size metadata is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'mistral:7b', description: 'Mistral model' } // 7 * 0.6 = 4.2
        ]
      });

      const client = new LlmfitClient();
      const models = await client.getModels();

      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({ name: 'mistral:7b', sizeGb: 4.2, description: 'Mistral model' });
    });

    it('should serialize query filters as URL query parameters and parse detailed fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'phi3:mini',
            sizeGb: 2.2,
            score: 98.4,
            score_components: { context: 100, fit: 100, quality: 96.5, speed: 100 },
            estimated_tps: 47.2,
            fit_level: 'Good',
            memory_required_gb: 10.7
          }
        ]
      });

      const client = new LlmfitClient('http://localhost:8787');
      const models = await client.getModels({ min_fit: 'good', limit: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/v1/models?min_fit=good&limit=1',
        expect.any(Object)
      );
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({
        name: 'phi3:mini',
        sizeGb: 2.2,
        description: 'Model fetched from llmfit (Fit score: 98.4)',
        score: 98.4,
        score_components: { context: 100, fit: 100, quality: 96.5, speed: 100 },
        estimated_tps: 47.2,
        fit_level: 'Good',
        memory_required_gb: 10.7
      });
    });

    it('should return empty list on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new LlmfitClient();
      const models = await client.getModels();

      expect(models).toEqual([]);
    });
  });

  describe('LlmfitRegistry', () => {
    it('should forward listAvailable to the client getModels', async () => {
      const mockClient = {
        getModels: vi.fn().mockResolvedValue([
          { name: 'test-model', sizeGb: 3.5, description: 'test' }
        ])
      } as any;

      const registry = new LlmfitRegistry(mockClient);
      const models = await registry.listAvailable();

      expect(mockClient.getModels).toHaveBeenCalled();
      expect(models).toEqual([{ name: 'test-model', sizeGb: 3.5, description: 'test' }]);
    });
  });
});
