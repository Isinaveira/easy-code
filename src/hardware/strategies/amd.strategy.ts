// src/hardware/strategies/amd.strategy.ts
import { execa } from 'execa';
import { GpuInfo } from '../types.js';
import { GpuDetectionStrategy } from './types.js';

export class AmdStrategy implements GpuDetectionStrategy {
  async detect(): Promise<GpuInfo | null> {
    try {
      const { stdout } = await execa('powershell', [
        '-Command',
        '(Get-CimInstance Win32_VideoController).AdapterRAM'
      ]);
      const bytes = parseInt(stdout.trim(), 10);
      if (isNaN(bytes)) return null;

      return {
        vendor: 'amd',
        model: 'AMD Radeon / Generic Video Controller',
        vramGb: Math.floor(bytes / (1024 * 1024 * 1024))
      };
    } catch {
      return null;
    }
  }
}
