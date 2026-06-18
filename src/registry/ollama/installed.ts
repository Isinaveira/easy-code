// src/registry/ollama/installed.ts
import { ModelDescriptor } from '../../compatibility/types.js';
import { LocalModelStore } from '../types.js';
import { OllamaClient } from './client.js';

export class OllamaInstalledStore implements LocalModelStore {
  private client: OllamaClient;

  constructor(client: OllamaClient) {
    this.client = client;
  }

  async listInstalled(): Promise<ModelDescriptor[]> {
    try {
      const data = await this.client.getTags();
      if (!data.models || !Array.isArray(data.models)) return [];

      return data.models.map(model => {
        const gbs = model.size / (1024 * 1024 * 1024);
        return {
          name: model.name,
          sizeGb: Math.round(gbs * 100) / 100
        };
      });
    } catch {
      return [];
    }
  }
}
