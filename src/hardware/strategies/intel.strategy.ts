// src/hardware/strategies/intel.strategy.ts
import { GpuInfo } from '../types.js';
import { GpuDetectionStrategy } from './types.js';

export class IntelStrategy implements GpuDetectionStrategy {
  async detect(): Promise<GpuInfo | null> {
    // Placeholder template for dedicated Intel Arc / iGPU detection.
    return null;
  }
}
