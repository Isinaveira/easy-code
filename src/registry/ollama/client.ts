// src/registry/ollama/client.ts
import { OllamaTagsResponse } from './types.js';

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async getTags(): Promise<OllamaTagsResponse> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    return await response.json() as OllamaTagsResponse;
  }
}
