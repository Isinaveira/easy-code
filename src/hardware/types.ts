// src/hardware/types.ts

export type OperatingSystem = 'darwin' | 'linux' | 'win32' | 'unknown';

export type AcceleratorType = 'cuda' | 'rocm' | 'metal' | 'cpu';

export interface CpuInfo {
  cores: number;
  model: string;
  architecture: string;
}

export interface GpuInfo {
  vendor: 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';
  model: string;
  vramGb: number;
}

export interface MemoryInfo {
  totalGb: number;
}

export interface HardwareProfile {
  os: OperatingSystem;
  cpu: CpuInfo;
  gpu: GpuInfo | null;
  memory: MemoryInfo;
  accelerator: AcceleratorType;
}
