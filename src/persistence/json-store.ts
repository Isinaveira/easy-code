// src/persistence/json-store.ts
import fs from 'fs/promises';
import { NodeState, PersistenceStore } from './types.js';

export class JsonPersistenceStore implements PersistenceStore {
  private filePath: string;

  constructor(filePath = './easy-code-state.json') {
    this.filePath = filePath;
  }

  async saveNodeState(state: NodeState): Promise<void> {
    const content = JSON.stringify(state, null, 2);
    await fs.writeFile(this.filePath, content, 'utf8');
  }

  async loadNodeState(): Promise<NodeState | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(content) as NodeState;
    } catch {
      return null;
    }
  }
}
