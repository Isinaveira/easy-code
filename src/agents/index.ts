// src/agents/index.ts

export * from './types.js';
export {
  selectBestModelForAgent,
  getSegmentedCatalogForAgent,
  AGENT_REQUIREMENTS_MAP,
  enrichModelDescriptor,
} from './selector.js';
export type { SegmentedCatalog } from './selector.js';
