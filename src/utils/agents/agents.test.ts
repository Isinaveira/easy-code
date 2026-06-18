// src/utils/agents.test.ts
import { describe, expect, it } from "vitest";
import { selectBestModelForAgent } from "./agents.js";

describe("Selector Inteligente por Rol de Desarrollo", () => {
  const catalogoMercado = [
    { 
      name: "advanced-reasoning:8b", 
      sizeGb: 5.5, 
      contextWindow: 16384,
      capabilities: ["tool-calling", "reasoning"],
      metrics: { reasoning: 95, coding: 80, speed: 60 }
    },
    { 
      name: "fast-coder:14b", 
      sizeGb: 9.0, 
      contextWindow: 32768,
      capabilities: ["tool-calling"],
      metrics: { reasoning: 70, coding: 92, speed: 75 }
    }
  ];

  it("debe elegir el experto en razonamiento para el orquestador principal", () => {
    const modelo = selectBestModelForAgent({
      agentProfile: "gentle-orchestrator",
      catalogo: catalogoMercado,
      availableVramGb: 12.0
    });

    expect(modelo.name).toBe("advanced-reasoning:8b");
  });

  it("debe elegir el modelo con mejor puntuación de código para la fase de aplicación de cambios", () => {
    const modelo = selectBestModelForAgent({
      agentProfile: "phase-apply",
      catalogo: catalogoMercado,
      availableVramGb: 12.0
    });

    expect(modelo.name).toBe("fast-coder:14b");
  });
});