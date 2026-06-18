// src/registry/llmfit/client.ts
import { ModelDescriptor } from '../../compatibility/types.js';

export class LlmfitClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8787') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Checks if the llmfit daemon is running and healthy.
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(1000) // 1 second timeout to avoid blocking CLI
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetches models from llmfit API and maps them to ModelDescriptor items.
   */
  async getModels(): Promise<ModelDescriptor[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/models`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      // Determine if response is a flat array or wrapped in { models: [...] }
      let rawModels: any[] = [];
      if (Array.isArray(data)) {
        rawModels = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.models)) {
        rawModels = data.models;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        rawModels = data.data;
      }

      return rawModels.map((item: any) => {
        const name = item.name || '';
        
        // Extract size in GB or fallback
        let sizeGb = 4.0; // conservative default
        if (typeof item.sizeGb === 'number') {
          sizeGb = item.sizeGb;
        } else if (typeof item.size_gb === 'number') {
          sizeGb = item.size_gb;
        } else if (typeof item.sizeBytes === 'number') {
          sizeGb = Math.round((item.sizeBytes / (1024 * 1024 * 1024)) * 100) / 100;
        } else if (typeof item.size_bytes === 'number') {
          sizeGb = Math.round((item.size_bytes / (1024 * 1024 * 1024)) * 100) / 100;
        } else if (typeof item.size === 'number') {
          // If size is a small float/int, assume GB. If huge, assume Bytes.
          if (item.size > 1000000) {
            sizeGb = Math.round((item.size / (1024 * 1024 * 1024)) * 100) / 100;
          } else {
            sizeGb = item.size;
          }
        } else {
          // Fallback parsing from name (e.g. "llama3:8b" -> 8B parameters -> ~4.8 GB)
          const paramMatch = name.match(/:(\d+(\.\d+)?)[bB]/);
          if (paramMatch) {
            const params = parseFloat(paramMatch[1]);
            // rough heuristic: 0.6 GB per billion parameters (Q4 quantization)
            sizeGb = Math.round(params * 0.6 * 10) / 10;
          }
        }

        return {
          name,
          sizeGb,
          description: item.description || `Model fetched from llmfit (Fit score: ${item.score ?? 'N/A'})`
        };
      });
    } catch (error) {
      // Graceful error fallback
      return [];
    }
  }
}
