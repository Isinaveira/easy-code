// src/services/ollama.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getInstalledModels } from "./ollama.js";

// Mockeamos el fetch global de Node 18+ para no hacer peticiones HTTP reales en los tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Servicio de Integración con Ollama API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe mapear correctamente los modelos devueltos por la API local a nuestro formato en GB", async () => {
    // Simulamos la respuesta real que escupe el endpoint /api/tags de Ollama
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3:8b", size: 4661021901 }, // ~4.34 GB en bytes
          { name: "phi3:mini", size: 2184010200 }  // ~2.03 GB en bytes
        ]
      })
    });

    const catalogo = await getInstalledModels();

    expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/tags");
    expect(catalogo).toHaveLength(2);
    
    // Verificamos que la conversión de bytes a GB sea exacta
    expect(catalogo[0]).toEqual({ name: "llama3:8b", sizeGb: 4.34 });
    expect(catalogo[1]).toEqual({ name: "phi3:mini", sizeGb: 2.03 });
  });

  it("debe devolver un catálogo vacío si el demonio de Ollama está caído o responde con error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Fetch failed (Connection refused)"));

    const catalogo = await getInstalledModels();

    expect(catalogo).toEqual([]);
  });
});