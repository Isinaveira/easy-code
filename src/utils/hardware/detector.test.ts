// src/utils/hardware/detector.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { detectAvailableHardwareVram } from "./detector.js";

// Instancias compartidas para poder manipular sus retornos dinámicamente en los tests
const mockNvidiaGetVram = vi.fn().mockResolvedValue(8);
const mockAmdGetVram = vi.fn().mockResolvedValue(0);
const mockAppleGetVram = vi.fn().mockResolvedValue(16);
const mockFallbackGetVram = vi.fn().mockResolvedValue(32);

// Mockeamos el módulo exportando clases ES6 reales que usan nuestras funciones simuladas
vi.mock("./strategies.js", () => {
  return {
    NvidiaStrategy: class { getVramGb = mockNvidiaGetVram; },
    AmdStrategy: class { getVramGb = mockAmdGetVram; },
    AppleSiliconStrategy: class { getVramGb = mockAppleGetVram; },
    CpuFallbackStrategy: class { getVramGb = mockFallbackGetVram; }
  };
});

describe("Factoría de Detección Automática de Hardware (Detector)", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restauramos los valores por defecto en cada iteración
    mockNvidiaGetVram.mockResolvedValue(8);
    mockAmdGetVram.mockResolvedValue(0);
    mockAppleGetVram.mockResolvedValue(16);
    mockFallbackGetVram.mockResolvedValue(32);
    
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it("debe elegir AppleSiliconStrategy si se ejecuta en macOS (darwin)", async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    
    const vram = await detectAvailableHardwareVram();
    
    expect(vram).toBe(16);
    expect(mockAppleGetVram).toHaveBeenCalled();
  });

  it("debe intentar Nvidia/AMD en Linux/Windows y usar Fallback de CPU si devuelven 0", async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    
    // Forzamos a que el mock de Nvidia devuelva 0 limpiamente sin pelear con prototipos
    mockNvidiaGetVram.mockResolvedValueOnce(0);
    
    const vram = await detectAvailableHardwareVram();
    
    expect(vram).toBe(32); // Salta correctamente al fallback
    expect(mockNvidiaGetVram).toHaveBeenCalled();
    expect(mockAmdGetVram).toHaveBeenCalled();
    expect(mockFallbackGetVram).toHaveBeenCalled();
  });
});