// src/utils/hardware/hardware.test.ts
import { describe, expect, it } from "vitest";
import { generateNodeTopologyConfig, filterModelsByVram } from "./hardware.js";

describe("Configuración de Topología y Asignación de Agentes por Nodo", () => {
  it("debe generar la configuración correcta para un nodo Master con agentes asignados y nombre genérico", () => {
    const seleccionUsuario = {
      nodeName: "master-node-01",
      nodeRole: "master",
      selectedAgents: ["phase-init", "phase-explore"]
    };

    const configEnv = generateNodeTopologyConfig(seleccionUsuario);

    expect(configEnv.NODE_NAME).toBe("master-node-01");
    expect(configEnv.NODE_ROLE).toBe("master");
    expect(configEnv.ACTIVE_AGENTS).toBe("phase-init,phase-explore");
  });

  it("debe permitir a un nodo de tipo Worker publicar únicamente un agente específico", () => {
    const seleccionUsuario = {
      nodeName: "worker-node-02",
      nodeRole: "worker",
      selectedAgents: ["consensus-fixer"]
    };

    const configEnv = generateNodeTopologyConfig(seleccionUsuario);

    expect(configEnv.NODE_NAME).toBe("worker-node-02");
    expect(configEnv.NODE_ROLE).toBe("worker");
    expect(configEnv.ACTIVE_AGENTS).toBe("consensus-fixer");
  });
});

describe("Filtro Físico de Modelos", () => {
  it("debe descartar los modelos que superen el límite de VRAM del hardware", () => {
    const catalogo = [
      { name: "modelo-ligero", sizeGb: 4.0 },
      { name: "modelo-pesado", sizeGb: 24.0 }
    ];
    
    const disponibles = filterModelsByVram(catalogo, 12.0);
    
    expect(disponibles).toHaveLength(1);
    expect(disponibles[0].name).toBe("modelo-ligero");
  });
});