// src/registry/hf/client.ts
import { HFCache } from './cache.js';
import { HFModelMetadata } from './types.js';
import { normalizeModelName } from './normalizer.js';

export class HFClient {
  private cache: HFCache;
  private reqCount: number = 0;
  private lastReqTime: number = 0;

  constructor(cacheDbPath?: string) {
    this.cache = new HFCache(cacheDbPath);
  }

  // Rate limiting simple: máximo 5 requests per second si es cold start masivo
  private async throttle() {
    const now = Date.now();
    if (now - this.lastReqTime < 1000) {
      this.reqCount++;
      if (this.reqCount > 5) {
        const delay = 1000 - (now - this.lastReqTime) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        this.reqCount = 0;
        this.lastReqTime = Date.now();
      }
    } else {
      this.reqCount = 1;
      this.lastReqTime = now;
    }
  }

  public async getModelMetadata(rawName: string): Promise<HFModelMetadata | null> {
    const normalized = normalizeModelName(rawName);
    const searchId = normalized.canonicalId;

    // 1. Hit cache
    const cached = this.cache.get(searchId);
    if (cached) return cached;

    await this.throttle();

    try {
      // 2. Direct lookup
      let meta = await this.fetchRepo(searchId);
      
      // 3. Fallback to search if direct lookup fails (404) and we don't have a reliable author
      if (!meta && !searchId.includes('/')) {
        await this.throttle();
        const searchResults = await this.searchModel(searchId);
        if (searchResults && searchResults.length > 0) {
          // Take the most downloaded result that matches the base name closely
          meta = searchResults[0];
        }
      }

      if (meta) {
        this.cache.set(searchId, meta);
        return meta;
      }
    } catch (err) {
      console.warn(`[HFClient] Error fetching metadata for ${searchId}:`, err);
    }

    return null;
  }

  private async fetchRepo(repoId: string): Promise<HFModelMetadata | null> {
    const url = `https://huggingface.co/api/models/${repoId}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.mapToMetadata(data);
  }

  private async searchModel(query: string): Promise<HFModelMetadata[] | null> {
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=3&sort=downloads&direction=-1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on search`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map(d => this.mapToMetadata(d));
    }
    return null;
  }

  private mapToMetadata(data: any): HFModelMetadata {
    return {
      id: data.id || data.modelId,
      tags: Array.isArray(data.tags) ? data.tags : [],
      pipeline_tag: data.pipeline_tag,
      downloads: data.downloads || 0,
      likes: data.likes || 0,
      lastModified: data.lastModified,
      author: data.author,
      license: data.tags?.find((t: string) => t.startsWith('license:'))?.replace('license:', '') || undefined
    };
  }
}
