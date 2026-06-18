// src/registry/ollama/types.ts

export interface OllamaModelDto {
  name: string;
  size: number;
}

export interface OllamaTagsResponse {
  models?: OllamaModelDto[];
}
