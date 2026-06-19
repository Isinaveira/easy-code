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
      const url = `${this.baseUrl}/api/v1/models/top` + (queryString ? `?${queryString}` : '');
      
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
        
        // Compute sizeGb from available memory fields or fallback heuristic
        let sizeGb = 4.0; // conservative default
        if (typeof item.memory_required_gb === 'number') {
          sizeGb = item.memory_required_gb;
        } else if (typeof item.total_memory_gb === 'number') {
          sizeGb = item.total_memory_gb;
        } else if (typeof item.sizeGb === 'number') {
          sizeGb = item.sizeGb;
        } else if (typeof item.size_gb === 'number') {
          sizeGb = item.size_gb;
        } else if (typeof item.sizeBytes === 'number') {
          sizeGb = Math.round((item.sizeBytes / (1024 * 1024 * 1024)) * 100) / 100;
        } else if (typeof item.size_bytes === 'number') {
          sizeGb = Math.round((item.size_bytes / (1024 * 1024 * 1024)) * 100) / 100;
        } else if (typeof item.size === 'number') {
          if (item.size > 1000000) {
            sizeGb = Math.round((item.size / (1024 * 1024 * 1024)) * 100) / 100;
          } else {
            sizeGb = item.size;
          }
        } else {
          const paramMatch = name.match(/:([\d]+(\.\d+)?)[bB]/);
          if (paramMatch) {
            const params = parseFloat(paramMatch[1]);
            sizeGb = Math.round(params * 0.6 * 10) / 10;
          }
        }

        // Pass through all API fields directly, only adding sizeGb as computed
        const descriptor: ModelDescriptor = {
          name,
          sizeGb,
          description: item.description || `Model fetched from llmfit (Fit score: ${item.score ?? 'N/A'})`,
          // Direct passthrough of all llmfit API fields
          score: typeof item.score === 'number' ? item.score : undefined,
          score_components: item.score_components || undefined,
          estimated_tps: typeof item.estimated_tps === 'number' ? item.estimated_tps : (typeof item.tps === 'number' ? item.tps : undefined),
          fit_level: item.fit_level || undefined,
          fit_label: item.fit_label || undefined,
          memory_required_gb: typeof item.memory_required_gb === 'number' ? item.memory_required_gb : undefined,
          total_memory_gb: typeof item.total_memory_gb === 'number' ? item.total_memory_gb : undefined,
          memory_available_gb: typeof item.memory_available_gb === 'number' ? item.memory_available_gb : undefined,
          utilization_pct: typeof item.utilization_pct === 'number' ? item.utilization_pct : undefined,
          moe_offloaded_gb: typeof item.moe_offloaded_gb === 'number' ? item.moe_offloaded_gb : null,
          parameter_count: item.parameter_count || undefined,
          params: item.params ? String(item.params) : (item.parameter_size ? String(item.parameter_size) : undefined),
          params_b: typeof item.params_b === 'number' ? item.params_b : undefined,
          is_moe: typeof item.is_moe === 'boolean' ? item.is_moe : undefined,
          category: item.category || undefined,
          provider: item.provider || undefined,
          license: item.license ?? null,
          release_date: item.release_date ?? null,
          best_quant: item.best_quant || undefined,
          context_length: typeof item.context_length === 'number' ? item.context_length : undefined,
          contextWindow: typeof item.context_length === 'number' ? item.context_length : (typeof item.contextWindow === 'number' ? item.contextWindow : undefined),
          use_case: item.use_case || undefined,
          use: item.use_case || item.use || undefined,
          capabilities: Array.isArray(item.capabilities) ? item.capabilities : undefined,
          supports_tp: Array.isArray(item.supports_tp) ? item.supports_tp : undefined,
          run_mode: item.run_mode || undefined,
          run_mode_label: item.run_mode_label || undefined,
          runtime: item.runtime || undefined,
          runtime_label: item.runtime_label || undefined,
          notes: Array.isArray(item.notes) ? item.notes : undefined,
          gguf_sources: Array.isArray(item.gguf_sources) ? item.gguf_sources : undefined,
          quant: item.quant || item.quantization || undefined,
          supportedOutputFormats: Array.isArray(item.supportedOutputFormats || item.output_formats || item.formats) ? (item.supportedOutputFormats || item.output_formats || item.formats) : undefined,
        };

        return descriptor;
      });
    } catch (error) {
      // Graceful error fallback
      return [];
    }
  }
}
