// src/registry/ollama/registry.ts
import { ModelDescriptor } from '../../compatibility/types.js';
import { ModelRegistry } from '../types.js';

export const OLLAMA_HUB_REGISTRY: ModelDescriptor[] = [
  { name: "phi3:mini (3.8B)", sizeGb: 2.2, description: "Modelo ligero e increíblemente eficiente de Microsoft" },
  { name: "llama3:8b (8B)", sizeGb: 4.7, description: "El estándar de la industria de Meta para tareas generales" },
  { name: "gemma2:9b (9B)", sizeGb: 5.5, description: "Modelo avanzado y compacto optimizado por Google" },
  { name: "mistral:7b (7B)", sizeGb: 4.1, description: "Gran balance entre velocidad y razonamiento lógico" },
  { name: "qwen2.5:7b (7B)", sizeGb: 4.7, description: "Líder indiscutible en tareas de código y multilenguaje" },
  { name: "deepseek-coder:6.7b", sizeGb: 3.8, description: "Especializado quirúrgicamente en refactorización y testing" },
  { name: "llama3.1:70b", sizeGb: 43.0, description: "Modelo masivo de alta fidelidad para entornos multi-GPU" }
];

export class OllamaRegistry implements ModelRegistry {
  async listAvailable(): Promise<ModelDescriptor[]> {
    return OLLAMA_HUB_REGISTRY;
  }
}
