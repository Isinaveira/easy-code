// src/registry/ollama/registry.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OllamaClient } from './client.js';
import { OllamaInstalledStore } from './installed.js';
import { OllamaRegistry } from './registry.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Ollama Sub-Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OllamaClient', () => {
    it('should query tags from correct URL and return JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'test', size: 100 }] })
      });

      const client = new OllamaClient('http://localhost:9999');
      const response = await client.getTags();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9999/api/tags');
      expect(response).toEqual({ models: [{ name: 'test', size: 100 }] });
    });

    it('should throw error if response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const client = new OllamaClient();
      await expect(client.getTags()).rejects.toThrow('Ollama API error: Internal Server Error');
    });
  });

  describe('OllamaInstalledStore', () => {
    it('should return parsed local models with GB precision', async () => {
      const mockClient = {
        getTags: vi.fn().mockResolvedValue({
          models: [
            { name: 'llama3:8b', size: 4661021901 }, // ~4.34 GB
            { name: 'phi3:mini', size: 2184010200 }  // ~2.03 GB
          ]
        })
      } as any;

      const store = new OllamaInstalledStore(mockClient);
      const installed = await store.listInstalled();

      expect(installed).toHaveLength(2);
      expect(installed[0]).toEqual({ name: 'llama3:8b', sizeGb: 4.34 });
      expect(installed[1]).toEqual({ name: 'phi3:mini', sizeGb: 2.03 });
    });

    it('should return empty list if client.getTags throws error', async () => {
      const mockClient = {
        getTags: vi.fn().mockRejectedValue(new Error('Connection refused'))
      } as any;

      const store = new OllamaInstalledStore(mockClient);
      const installed = await store.listInstalled();

      expect(installed).toEqual([]);
    });
  });

  describe('OllamaRegistry', () => {
    it('should list available hub models', async () => {
      const registry = new OllamaRegistry();
      const models = await registry.listAvailable();

      expect(models.length).toBeGreaterThan(0);
      expect(models.find(m => m.name.startsWith('llama3'))).toBeDefined();
    });
  });
});
