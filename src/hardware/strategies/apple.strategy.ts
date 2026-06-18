// src/hardware/strategies/apple.strategy.ts
import { execa } from 'execa';
import { GpuInfo } from '../types.js';
import { GpuDetectionStrategy } from './types.js';

export class AppleSiliconStrategy implements GpuDetectionStrategy {
  async detect(): Promise<GpuInfo | null> {
    try {
      const { stdout } = await execa('system_profiler', ['SPHardwareDataType']);
      const match = stdout.match(/Memory:\s+(\d+)\s+GB/);
      if (match && match[1]) {
        const memoryGb = parseInt(match[1], 10);
        return {
          vendor: 'apple',
          model: 'Apple Silicon Unified Memory',
          vramGb: memoryGb
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
