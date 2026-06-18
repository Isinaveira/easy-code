// src/services/ollama.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getEligibleModelsCatalog } from "./ollama.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Servicio de Catálogo Elástico Cruzado (Local + Hub)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe separar locales de disponibles para descargar, filtrando por VRAM y evitando duplicados", async () => {
    // Simulamos que el usuario ya tiene descargado localmente 'phi3:mini'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { name: "phi3:mini", size: 2362232012 } // ~2.20 GB
        ]
      })
    });

    // Simulamos un hardware con un límite de 8 GB de VRAM efectivos
    const availableVramGb = 8;

    const { installed, availableToDownload } = await getEligibleModelsCatalog(availableVramGb);

    // 1. Validar instalados locales
    expect(installed).toHaveLength(1);
    expect(installed[0].name).toBe("phi3:mini");

    // 2. Validar disponibles para descargar del Hub (Filtrados por hardware)
    // Deberían aparecer modelos ligeros compatibles (ej: gemma2:9b, llama3:8b)
    // Pero NUNCA debe aparecer 'phi3:mini' (ya está instalado) ni modelos gigantescos > 8 GB
    const gemma2 = availableToDownload.find(m => m.name.startsWith("gemma2"));
    const llama3 = availableToDownload.find(m => m.name.startsWith("llama3:8b"));
    const deepseekLarge = availableToDownload.find(m => m.name.includes("70b"));

    expect(gemma2).toBeDefined();
    expect(llama3).toBeDefined();
    expect(deepseekLarge).toBeUndefined(); // Fulminado del catálogo por exceder los 8 GB
    
    // Comprobar que no hay duplicación
    const duplicadoLocalEnHub = availableToDownload.find(m => m.name === "phi3:mini");
    expect(duplicadoLocalEnHub).toBeUndefined();
  });
});