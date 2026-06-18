// src/hardware/profile.ts
import { HardwareProfile, OperatingSystem, CpuInfo, GpuInfo, MemoryInfo, AcceleratorType } from './types.js';

export interface BuildProfileOptions {
  os: OperatingSystem;
  cpu: CpuInfo;
  gpu: GpuInfo | null;
  memory: MemoryInfo;
}

export function buildHardwareProfile(options: BuildProfileOptions): HardwareProfile {
  const { os, cpu, gpu, memory } = options;
  let accelerator: AcceleratorType = 'cpu';

  if (gpu) {
    if (gpu.vendor === 'nvidia' && (os === 'win32' || os === 'linux')) {
      accelerator = 'cuda';
    } else if (gpu.vendor === 'apple' && os === 'darwin') {
      accelerator = 'metal';
    } else if (gpu.vendor === 'amd' && (os === 'linux' || os === 'win32')) {
      accelerator = 'rocm';
    }
  }

  return {
    os,
    cpu,
    gpu,
    memory,
    accelerator
  };
}
