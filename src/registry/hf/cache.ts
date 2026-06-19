// src/registry/hf/cache.ts
import path from 'path';
import fs from 'fs';
import { HFModelMetadata } from './types.js';

interface CacheEntry {
  metadata: HFModelMetadata;
  timestamp: number;
}

export class HFCache {
  private cachePath: string;
  private data: Record<string, CacheEntry> = {};

  constructor(dbPath?: string) {
    this.cachePath = dbPath || path.join(process.cwd(), 'easy-code-hf-cache.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const fileContent = fs.readFileSync(this.cachePath, 'utf-8');
        this.data = JSON.parse(fileContent);
      }
    } catch (e) {
      console.warn('[HFCache] No se pudo leer la caché local, iniciando limpia.');
      this.data = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[HFCache] Error guardando la caché local.');
    }
  }

  public get(modelId: string): HFModelMetadata | null {
    const entry = this.data[modelId];

    if (!entry) return null;

    // TTL 30 días
    const TTL_MS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > TTL_MS) {
      delete this.data[modelId];
      this.save();
      return null;
    }

    return entry.metadata;
  }

  public set(modelId: string, metadata: HFModelMetadata): void {
    this.data[modelId] = {
      metadata,
      timestamp: Date.now()
    };
    this.save();
  }

  public clear(): void {
    this.data = {};
    this.save();
  }
}
