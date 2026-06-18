// src/registry/llmfit/registry.ts
import { ModelDescriptor } from '../../compatibility/types.js';
import { ModelRegistry } from '../types.js';
import { LlmfitClient } from './client.js';

export class LlmfitRegistry implements ModelRegistry {
  private client: LlmfitClient;

  constructor(client: LlmfitClient = new LlmfitClient()) {
    this.client = client;
  }

  async listAvailable(): Promise<ModelDescriptor[]> {
    return this.client.getModels();
  }
}
