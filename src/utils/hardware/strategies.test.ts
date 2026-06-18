import { describe, expect, it, vi, beforeEach } from "vitest";
import { execa } from "execa";
import os from "os"; // Usaremos el módulo nativo de Node para la RAM
import { NvidiaStrategy, AmdStrategy, AppleSiliconStrategy, CpuFallbackStrategy } from "./strategies.js";

vi.mock("execa");
vi.mock("os");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Estrategias de Detección de VRAM por Hardware", () => {
  
  it("NvidiaStrategy debe parsear correctamente la salida de nvidia-smi", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "12288\n" } as any);
    const strategy = new NvidiaStrategy();
    expect(await strategy.getVramGb()).toBe(12);
  });

  it("AmdStrategy debe detectar la VRAM mediante consultas rápidas de PowerShell/sysfs", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "8589934592\n" } as any); // 8 GB en bytes de PowerShell
    const strategy = new AmdStrategy();
    expect(await strategy.getVramGb()).toBe(8);
  });

  it("AppleSiliconStrategy debe extraer la memoria unificada en macOS", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "Memory: 16 GB" } as any);
    const strategy = new AppleSiliconStrategy();
    expect(await strategy.getVramGb()).toBe(16);
  });

  // ◄ NUEVO: Test de seguridad para APUs / Integradas / Equipos sin GPU
  it("CpuFallbackStrategy debe leer la RAM total del sistema usando el módulo os", async () => {
    // Simulamos un equipo con 16 GB de RAM física total
    vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
    
    const strategy = new CpuFallbackStrategy();
    const ramDisponible = await strategy.getVramGb(); // Devuelve la RAM total mapeada como techo
    
    expect(ramDisponible).toBe(16);
  });
});