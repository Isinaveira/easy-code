// src/hardware/strategies/nvidia.strategy.ts
import { execa } from 'execa';
import { GpuInfo } from '../types.js';
import { GpuDetectionStrategy } from './types.js';

export class NvidiaStrategy implements GpuDetectionStrategy {
  async detect(): Promise<GpuInfo | null> {
    try {
      const { stdout } = await execa('nvidia-smi', [
        '--query-gpu=memory.total',
        '--format=csv,noheader,nounits'
      ]);
      const mbs = parseInt(stdout.trim(), 10);
      if (isNaN(mbs)) return null;

      return {
        vendor: 'nvidia',
        model: 'Nvidia GPU',
        vramGb: Math.floor(mbs / 1024)
      };
    } catch {
      return null;
    }
  }
}
