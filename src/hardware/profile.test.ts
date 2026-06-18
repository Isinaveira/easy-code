// src/hardware/profile.test.ts
import { describe, expect, it } from 'vitest';
import { buildHardwareProfile } from './profile.js';
import { CpuInfo, GpuInfo, MemoryInfo } from './types.js';

describe('HardwareProfile Builder', () => {
  const mockCpu: CpuInfo = {
    cores: 8,
    model: 'Intel Core i7',
    architecture: 'x64'
  };

  const mockMemory: MemoryInfo = {
    totalGb: 16
  };

  it('should build a CPU-only profile when no GPU is present', () => {
    const profile = buildHardwareProfile({
      os: 'win32',
      cpu: mockCpu,
      gpu: null,
      memory: mockMemory
    });

    expect(profile.os).toBe('win32');
    expect(profile.gpu).toBeNull();
    expect(profile.accelerator).toBe('cpu');
  });

  it('should build a CUDA profile when an Nvidia GPU is present on Windows or Linux', () => {
    const gpu: GpuInfo = {
      vendor: 'nvidia',
      model: 'RTX 4070',
      vramGb: 12
    };

    const profileWin = buildHardwareProfile({
      os: 'win32',
      cpu: mockCpu,
      gpu,
      memory: mockMemory
    });

    const profileLinux = buildHardwareProfile({
      os: 'linux',
      cpu: mockCpu,
      gpu,
      memory: mockMemory
    });

    expect(profileWin.accelerator).toBe('cuda');
    expect(profileLinux.accelerator).toBe('cuda');
  });

  it('should build a Metal profile when running on macOS with an Apple GPU', () => {
    const gpu: GpuInfo = {
      vendor: 'apple',
      model: 'Apple M2',
      vramGb: 16
    };

    const profile = buildHardwareProfile({
      os: 'darwin',
      cpu: { ...mockCpu, architecture: 'arm64' },
      gpu,
      memory: mockMemory
    });

    expect(profile.accelerator).toBe('metal');
  });

  it('should fallback to CPU if GPU is Nvidia but OS is macOS (not supported for CUDA)', () => {
    const gpu: GpuInfo = {
      vendor: 'nvidia',
      model: 'GTX 1080',
      vramGb: 8
    };

    const profile = buildHardwareProfile({
      os: 'darwin',
      cpu: mockCpu,
      gpu,
      memory: mockMemory
    });

    expect(profile.accelerator).toBe('cpu');
  });
});
