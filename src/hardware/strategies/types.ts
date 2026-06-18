// src/hardware/strategies/types.ts
import { GpuInfo, CpuInfo, MemoryInfo } from '../types.js';

export interface GpuDetectionStrategy {
  detect(): Promise<GpuInfo | null>;
}

export interface CpuDetectionStrategy {
  detectCpu(): Promise<CpuInfo>;
}

export interface MemoryDetectionStrategy {
  detectMemory(): Promise<MemoryInfo>;
}
