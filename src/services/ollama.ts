// src/services/ollama.ts

export interface OllamaModel {
  name: string;
  sizeGb: number;
}

/**
 * Interroga al demonio local de Ollama para obtener el catálogo de modelos
 * ya descargados, convirtiendo sus tamaños a GB con precisión.
 */
export async function getInstalledModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { models?: Array<{ name: string; size: number }> };
    
    if (!data.models || !Array.isArray(data.models)) {
      return [];
    }

    return data.models.map(model => {
      // Conversión matemática exacta de Bytes a Gigabytes (1024^3)
      const gbs = model.size / (1024 * 1024 * 1024);
      
      return {
        name: model.name,
        // Redondeamos a 2 decimales para homogeneizar con el filtro elástico
        sizeGb: Math.round(gbs * 100) / 100
      };
    });
  } catch {
    // Si Ollama está apagado o el puerto bloqueado, devolvemos un array vacío de seguridad
    return [];
  }
}