// src/hardware/strategies/cpu.strategy.ts
import os from 'os';
import { CpuInfo, MemoryInfo } from '../types.js';
import { CpuDetectionStrategy, MemoryDetectionStrategy } from './types.js';

export class CpuStrategy implements CpuDetectionStrategy, MemoryDetectionStrategy {
  async detectCpu(): Promise<CpuInfo> {
    const cpus = os.cpus();
    const cores = cpus.length || 1;
    const model = cpus[0]?.model || 'Generic CPU';
    const architecture = os.arch();

    return {
      cores,
      model,
      architecture
    };
  }

  async detectMemory(): Promise<MemoryInfo> {
    const totalBytes = os.totalmem();
    const totalGb = Math.floor(totalBytes / (1024 * 1024 * 1024));

    return {
      totalGb
    };
  }
}
