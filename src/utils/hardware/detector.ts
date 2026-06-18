// src/utils/hardware/detector.ts
import { NvidiaStrategy, AmdStrategy, AppleSiliconStrategy, CpuFallbackStrategy } from './strategies.js';

/**
 * Orquesta la detección automática de la memoria gráfica (o RAM de respaldo)
 * priorizando la aceleración por hardware según el Sistema Operativo.
 */
export async function detectAvailableHardwareVram(): Promise<number> {
  const platform = process.platform;

  // 1. Entorno Apple Silicon (macOS)
  if (platform === 'darwin') {
    const appleSilicon = new AppleSiliconStrategy();
    const vram = await appleSilicon.getVramGb();
    if (vram > 0) return vram;
  }

  // 2. Entornos Linux / Windows: Prioridad a tarjetas dedicadas
  if (platform === 'linux' || platform === 'win32') {
    // Intentamos primero con el ecosistema Nvidia CUDA
    const nvidia = new NvidiaStrategy();
    let vram = await nvidia.getVramGb();
    if (vram > 0) return vram;

    // Si falla o no es Nvidia, probamos con la estrategia AMD/Intel nativa
    const amdIntel = new AmdStrategy();
    vram = await amdIntel.getVramGb();
    if (vram > 0) return vram;
  }

  // 3. Fallback Universal: APUs, gráficas integradas sin memoria dedicada o CPU pura
  const fallback = new CpuFallbackStrategy();
  return await fallback.getVramGb();
}