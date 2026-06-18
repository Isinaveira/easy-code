// src/utils/hardware/hardware.ts

export interface NodeTopologyOptions {
  nodeName: string;
  nodeRole: string;
  selectedAgents: string[];
}

/**
 * Genera el objeto de configuración del entorno para persistir la topología de la red.
 * Mapea el nombre personalizado del nodo y los agentes asignados a este hardware.
 */
export function generateNodeTopologyConfig(options: NodeTopologyOptions) {
  return {
    NODE_NAME: options.nodeName,
    NODE_ROLE: options.nodeRole,
    ACTIVE_AGENTS: options.selectedAgents.join(',')
  };
}

/**
 * Filtra un catálogo de modelos del mercado basándose únicamente en el límite físico de VRAM
 */
export function filterModelsByVram(catalogo: any[], availableVramGb: number) {
  return catalogo.filter(model => model.sizeGb <= availableVramGb);
}