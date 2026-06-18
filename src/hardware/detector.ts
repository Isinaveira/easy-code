// src/hardware/detector.ts
import { HardwareProfile, OperatingSystem } from './types.js';
import { buildHardwareProfile } from './profile.js';
import { GpuDetectionStrategy, CpuDetectionStrategy, MemoryDetectionStrategy } from './strategies/types.js';
import { NvidiaStrategy, AmdStrategy, IntelStrategy, AppleSiliconStrategy, CpuStrategy } from './strategies/index.js';

export interface DetectorStrategies {
  nvidia: GpuDetectionStrategy;
  amd: GpuDetectionStrategy;
  intel: GpuDetectionStrategy;
  apple: GpuDetectionStrategy;
  cpu: CpuDetectionStrategy;
  memory: MemoryDetectionStrategy;
}

export class HardwareDetector {
  private strategies: DetectorStrategies;

  constructor(strategies: DetectorStrategies) {
    this.strategies = strategies;
  }

  /**
   * Orchestrates the automatic hardware capability discovery process
   * and returns a unified HardwareProfile.
   */
  async detect(forcedPlatform?: string): Promise<HardwareProfile> {
    const platform = (forcedPlatform || process.platform) as OperatingSystem;
    const cpu = await this.strategies.cpu.detectCpu();
    const memory = await this.strategies.memory.detectMemory();
    let gpu: any = null;

    if (platform === 'darwin') {
      gpu = await this.strategies.apple.detect();
    } else if (platform === 'win32' || platform === 'linux') {
      gpu = await this.strategies.nvidia.detect();
      if (!gpu) {
        gpu = await this.strategies.amd.detect();
      }
      if (!gpu) {
        gpu = await this.strategies.intel.detect();
      }
    }

    return buildHardwareProfile({
      os: platform,
      cpu,
      gpu,
      memory
    });
  }

  /**
   * Factory method to create a detector with default real strategies.
   */
  static createDefault(): HardwareDetector {
    const cpuStrategy = new CpuStrategy();
    return new HardwareDetector({
      nvidia: new NvidiaStrategy(),
      amd: new AmdStrategy(),
      intel: new IntelStrategy(),
      apple: new AppleSiliconStrategy(),
      cpu: cpuStrategy,
      memory: cpuStrategy
    });
  }
}
