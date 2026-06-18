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

  async getModels(filters: Record<string, any> = {}): Promise<ModelDescriptor[]> {
    try {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/api/v1/models` + (queryString ? `?${queryString}` : '');
      
      const response = await fetch(url, {
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

        const descriptor: any = {
          name,
          sizeGb,
          description: item.description || `Model fetched from llmfit (Fit score: ${item.score ?? 'N/A'})`
        };

        if (typeof item.score === 'number' || item.min_fit) {
          descriptor.score = typeof item.score === 'number' ? item.score : (item.min_fit === 'good' ? 80 : 50);
        }
        if (item.use || item.useCase || item.use_case) {
          descriptor.use = item.use || item.useCase || item.use_case;
        }
        if (item.quant || item.quantization) {
          descriptor.quant = item.quant || item.quantization;
        }
        const parameterSize = item.params || item.parameter_size || item.parameters;
        if (parameterSize) {
          descriptor.params = typeof parameterSize === 'number' ? `${parameterSize}B` : String(parameterSize);
        }
        if (item.score_components) {
          descriptor.score_components = item.score_components;
        }
        const tps = item.estimated_tps || item.tps;
        if (typeof tps === 'number') {
          descriptor.estimated_tps = tps;
        }
        const fit = item.fit_level || item.fit;
        if (fit) {
          descriptor.fit_level = String(fit);
        }
        const mem = item.memory_required_gb || item.total_memory_gb;
        if (typeof mem === 'number') {
          descriptor.memory_required_gb = mem;
        }
        if (Array.isArray(item.capabilities)) {
          descriptor.capabilities = item.capabilities;
        }
        const cw = item.contextWindow || item.context_window || item.context;
        if (typeof cw === 'number') {
          descriptor.contextWindow = cw;
        }
        const formats = item.supportedOutputFormats || item.output_formats || item.formats;
        if (Array.isArray(formats)) {
          descriptor.supportedOutputFormats = formats;
        }

        return descriptor;
      });
    } catch (error) {
      // Graceful error fallback
      return [];
    }
  }
}
