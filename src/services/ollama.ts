// src/services/ollama.ts

export interface OllamaModel {
  name: string;
  sizeGb: number;
  description?: string;
}

export interface CatalogResult {
  installed: OllamaModel[];
  availableToDownload: OllamaModel[];
}

// Matriz Estática del Hub Oficial de Ollama (Pesos reales en disco)
const OLLAMA_HUB_REGISTRY: OllamaModel[] = [
  { name: "phi3:mini (3.8B)", sizeGb: 2.2, description: "Modelo ligero e increíblemente eficiente de Microsoft" },
  { name: "llama3:8b (8B)", sizeGb: 4.7, description: "El estándar de la industria de Meta para tareas generales" },
  { name: "gemma2:9b (9B)", sizeGb: 5.5, description: "Modelo avanzado y compacto optimizado por Google" },
  { name: "mistral:7b (7B)", sizeGb: 4.1, description: "Gran balance entre velocidad y razonamiento lógico" },
  { name: "qwen2.5:7b (7B)", sizeGb: 4.7, description: "Líder indiscutible en tareas de código y multilenguaje" },
  { name: "deepseek-coder:6.7b", sizeGb: 3.8, description: "Especializado quirúrgicamente en refactorización y testing" },
  { name: "llama3.1:70b", sizeGb: 43.0, description: "Modelo masivo de alta fidelidad para entornos multi-GPU" }
];

/**
 * Interroga al demonio local de Ollama para obtener el catálogo de modelos
 * ya descargados, convirtiendo sus tamaños a GB con precisión.
 */
export async function getInstalledModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return [];

    const data = await response.json() as { models?: Array<{ name: string; size: number }> };
    if (!data.models || !Array.isArray(data.models)) return [];

    return data.models.map(model => {
      const gbs = model.size / (1024 * 1024 * 1024);
      return {
        name: model.name,
        sizeGb: Math.round(gbs * 100) / 100
      };
    });
  } catch {
    return [];
  }
}

/**
 * Obtiene el ecosistema completo de modelos segmentado para el usuario,
 * aplicando el filtro elástico de hardware dinámicamente.
 */
export async function getEligibleModelsCatalog(effectiveVramGb: number): Promise<CatalogResult> {
  // 1. Obtener lo que ya está en el disco local
  const installed = await getInstalledModels();

  // 2. Filtrar el Hub Global para que SOLO contenga lo que el hardware del usuario puede soportar
  const allowedHubModels = OLLAMA_HUB_REGISTRY.filter(hubModel => hubModel.sizeGb <= effectiveVramGb);

  // 3. Excluir del catálogo de descargas aquellos modelos que el usuario ya tenga instalados localmente
  // Comparamos de forma flexible si el nombre del local está contenido o mapea con el del Hub
  const availableToDownload = allowedHubModels.filter(hubModel => {
    return !installed.some(localModel => 
      localModel.name.toLowerCase().trim() === hubModel.name.toLowerCase().split(" ")[0].trim() ||
      hubModel.name.toLowerCase().includes(localModel.name.toLowerCase().trim())
    );
  });

  return {
    installed,
    availableToDownload
  };
}