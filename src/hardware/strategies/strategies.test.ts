// src/hardware/strategies/strategies.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import os from 'os';
import { NvidiaStrategy } from './nvidia.strategy.js';
import { AmdStrategy } from './amd.strategy.js';
import { AppleSiliconStrategy } from './apple.strategy.js';
import { IntelStrategy } from './intel.strategy.js';
import { CpuStrategy } from './cpu.strategy.js';

vi.mock('execa');
vi.mock('os');

describe('Hardware Detection Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NvidiaStrategy', () => {
    it('should parse nvidia-smi output and return GpuInfo', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '12288\n' } as any);

      const strategy = new NvidiaStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toEqual({
        vendor: 'nvidia',
        model: 'Nvidia GPU',
        vramGb: 12
      });
      expect(execa).toHaveBeenCalledWith('nvidia-smi', [
        '--query-gpu=memory.total',
        '--format=csv,noheader,nounits'
      ]);
    });

    it('should return null if nvidia-smi fails', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('nvidia-smi command not found'));

      const strategy = new NvidiaStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toBeNull();
    });
  });

  describe('AmdStrategy', () => {
    it('should query Windows WMI and return GpuInfo', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '8589934592\n' } as any); // 8 GB in bytes

      const strategy = new AmdStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toEqual({
        vendor: 'amd',
        model: 'AMD Radeon / Generic Video Controller',
        vramGb: 8
      });
    });

    it('should return null if WMI query fails or AdapterRAM is invalid', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('WMI error'));

      const strategy = new AmdStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toBeNull();
    });
  });

  describe('AppleSiliconStrategy', () => {
    it('should extract unified memory on macOS and return GpuInfo', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'Memory: 16 GB' } as any);

      const strategy = new AppleSiliconStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toEqual({
        vendor: 'apple',
        model: 'Apple Silicon Unified Memory',
        vramGb: 16
      });
    });

    it('should return null if system_profiler fails or memory not found', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('macOS profile error'));

      const strategy = new AppleSiliconStrategy();
      const gpu = await strategy.detect();

      expect(gpu).toBeNull();
    });
  });

  describe('IntelStrategy', () => {
    it('should return null by default (Intel dedicated strategy template)', async () => {
      const strategy = new IntelStrategy();
      const gpu = await strategy.detect();
      expect(gpu).toBeNull();
    });
  });

  describe('CpuStrategy', () => {
    it('should read system CPU and memory details correctly', async () => {
      vi.mocked(os.cpus).mockReturnValue([
        { model: 'Intel Core i9', speed: 3600, times: {} },
        { model: 'Intel Core i9', speed: 3600, times: {} }
      ] as any);
      vi.mocked(os.arch).mockReturnValue('x64');
      vi.mocked(os.totalmem).mockReturnValue(32 * 1024 * 1024 * 1024); // 32 GB

      const strategy = new CpuStrategy();
      const cpu = await strategy.detectCpu();
      const memory = await strategy.detectMemory();

      expect(cpu).toEqual({
        cores: 2,
        model: 'Intel Core i9',
        architecture: 'x64'
      });
      expect(memory).toEqual({
        totalGb: 32
      });
    });

    it('should fallback gracefully if cpus() returns empty', async () => {
      vi.mocked(os.cpus).mockReturnValue([]);
      vi.mocked(os.arch).mockReturnValue('arm64');
      vi.mocked(os.totalmem).mockReturnValue(8 * 1024 * 1024 * 1024);

      const strategy = new CpuStrategy();
      const cpu = await strategy.detectCpu();
      const memory = await strategy.detectMemory();

      expect(cpu.cores).toBe(1);
      expect(cpu.model).toBe('Generic CPU');
      expect(cpu.architecture).toBe('arm64');
      expect(memory.totalGb).toBe(8);
    });
  });
});
