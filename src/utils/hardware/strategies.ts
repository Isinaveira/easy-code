// src/utils/hardware/strategies.ts
import { execa } from 'execa';
import os from 'os';

export interface HardwareStrategy {
  getVramGb(): Promise<number>;
}

// 1. ESTRATEGIA NVIDIA: El estándar para CUDA en Linux/Windows
export class NvidiaStrategy implements HardwareStrategy {
  async getVramGb(): Promise<number> {
    try {
      // Devuelve la memoria total directamente en megabytes (ej: "12288")
      const { stdout } = await execa('nvidia-smi', [
        '--query-gpu=memory.total',
        '--format=csv,noheader,nounits'
      ]);
      const mbs = parseInt(stdout.trim(), 10);
      return Math.floor(mbs / 1024);
    } catch {
      return 0;
    }
  }
}

// 2. ESTRATEGIA AMD / INTEL: Para Windows nativo y consultas ágiles
export class AmdStrategy implements HardwareStrategy {
  async getVramGb(): Promise<number> {
    try {
      // Consultamos la propiedad de la controladora de video a través de WMI/CIM en bytes
      const { stdout } = await execa('powershell', [
        '-Command',
        '(Get-CimInstance Win32_VideoController).AdapterRAM'
      ]);
      const bytes = parseInt(stdout.trim(), 10);
      if (isNaN(bytes)) return 0;
      return Math.floor(bytes / (1024 * 1024 * 1024));
    } catch {
      return 0;
    }
  }
}

// 3. ESTRATEGIA APPLE SILICON: Memoria unificada SOC
export class AppleSiliconStrategy implements HardwareStrategy {
  async getVramGb(): Promise<number> {
    try {
      const { stdout } = await execa('system_profiler', ['SPHardwareDataType']);
      // Buscamos la línea "Memory: X GB"
      const match = stdout.match(/Memory:\s+(\d+)\s+GB/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// 4. ESTRATEGIA FALLBACK: El salvavidas para APUs / Integradas / CPUpura
export class CpuFallbackStrategy implements HardwareStrategy {
  async getVramGb(): Promise<number> {
    // Leemos la RAM física total del equipo y la tratamos como techo elástico
    const totalBytes = os.totalmem();
    return Math.floor(totalBytes / (1024 * 1024 * 1024));
  }
}