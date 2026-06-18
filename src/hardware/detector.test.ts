// src/hardware/detector.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HardwareDetector } from './detector.js';
import { GpuDetectionStrategy, CpuDetectionStrategy, MemoryDetectionStrategy } from './strategies/types.js';
import { CpuInfo, GpuInfo, MemoryInfo } from './types.js';

describe('HardwareDetector with DIP', () => {
  const mockCpuInfo: CpuInfo = {
    cores: 4,
    model: 'Mock CPU',
    architecture: 'x64'
  };

  const mockMemoryInfo: MemoryInfo = {
    totalGb: 8
  };

  let mockNvidia: GpuDetectionStrategy;
  let mockAmd: GpuDetectionStrategy;
  let mockIntel: GpuDetectionStrategy;
  let mockApple: GpuDetectionStrategy;
  let mockCpu: CpuDetectionStrategy;
  let mockMemory: MemoryDetectionStrategy;

  beforeEach(() => {
    mockNvidia = { detect: vi.fn().mockResolvedValue(null) };
    mockAmd = { detect: vi.fn().mockResolvedValue(null) };
    mockIntel = { detect: vi.fn().mockResolvedValue(null) };
    mockApple = { detect: vi.fn().mockResolvedValue(null) };
    mockCpu = { detectCpu: vi.fn().mockResolvedValue(mockCpuInfo) };
    mockMemory = { detectMemory: vi.fn().mockResolvedValue(mockMemoryInfo) };
  });

  it('should detect Apple GPU on macOS (darwin) and set metal accelerator', async () => {
    const appleGpu: GpuInfo = {
      vendor: 'apple',
      model: 'Apple M1',
      vramGb: 16
    };
    vi.mocked(mockApple.detect).mockResolvedValue(appleGpu);

    const detector = new HardwareDetector({
      nvidia: mockNvidia,
      amd: mockAmd,
      intel: mockIntel,
      apple: mockApple,
      cpu: mockCpu,
      memory: mockMemory
    });

    const profile = await detector.detect('darwin');

    expect(profile.os).toBe('darwin');
    expect(profile.gpu).toEqual(appleGpu);
    expect(profile.accelerator).toBe('metal');
    expect(mockApple.detect).toHaveBeenCalled();
    expect(mockNvidia.detect).not.toHaveBeenCalled();
  });

  it('should detect Nvidia GPU on linux and set cuda accelerator', async () => {
    const nvidiaGpu: GpuInfo = {
      vendor: 'nvidia',
      model: 'RTX 3080',
      vramGb: 10
    };
    vi.mocked(mockNvidia.detect).mockResolvedValue(nvidiaGpu);

    const detector = new HardwareDetector({
      nvidia: mockNvidia,
      amd: mockAmd,
      intel: mockIntel,
      apple: mockApple,
      cpu: mockCpu,
      memory: mockMemory
    });

    const profile = await detector.detect('linux');

    expect(profile.os).toBe('linux');
    expect(profile.gpu).toEqual(nvidiaGpu);
    expect(profile.accelerator).toBe('cuda');
    expect(mockNvidia.detect).toHaveBeenCalled();
    expect(mockAmd.detect).not.toHaveBeenCalled();
  });

  it('should try AMD if Nvidia fails on Windows', async () => {
    const amdGpu: GpuInfo = {
      vendor: 'amd',
      model: 'RX 6700 XT',
      vramGb: 12
    };
    vi.mocked(mockAmd.detect).mockResolvedValue(amdGpu);

    const detector = new HardwareDetector({
      nvidia: mockNvidia,
      amd: mockAmd,
      intel: mockIntel,
      apple: mockApple,
      cpu: mockCpu,
      memory: mockMemory
    });

    const profile = await detector.detect('win32');

    expect(profile.os).toBe('win32');
    expect(profile.gpu).toEqual(amdGpu);
    expect(profile.accelerator).toBe('rocm');
    expect(mockNvidia.detect).toHaveBeenCalled();
    expect(mockAmd.detect).toHaveBeenCalled();
  });

  it('should fallback to cpu-only if all GPU detection strategies return null', async () => {
    const detector = new HardwareDetector({
      nvidia: mockNvidia,
      amd: mockAmd,
      intel: mockIntel,
      apple: mockApple,
      cpu: mockCpu,
      memory: mockMemory
    });

    const profile = await detector.detect('win32');

    expect(profile.os).toBe('win32');
    expect(profile.gpu).toBeNull();
    expect(profile.accelerator).toBe('cpu');
    expect(mockNvidia.detect).toHaveBeenCalled();
    expect(mockAmd.detect).toHaveBeenCalled();
    expect(mockIntel.detect).toHaveBeenCalled();
  });
});
