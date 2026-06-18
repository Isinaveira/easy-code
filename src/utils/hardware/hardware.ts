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
 * Filtra un catálogo de modelos del mercado basándose en los límites de hardware.
 * Si opera en modo CPU/APU, resta un margen de seguridad de 4GB para la estabilidad del sistema operativo.
 */
export function filterModelsByVram(catalogo: any[], availableMemGb: number, isCpuMode = false) {
  const safetyMargin = isCpuMode ? 4 : 0;
  const effectiveTechoGb = availableMemGb - safetyMargin;

  return catalogo.filter(model => model.sizeGb <= effectiveTechoGb);
}