// src/registry/types.ts
import { ModelDescriptor } from '../compatibility/types.js';

export interface ModelRegistry {
  listAvailable(): Promise<ModelDescriptor[]>;
}

export interface LocalModelStore {
  listInstalled(): Promise<ModelDescriptor[]>;
}
