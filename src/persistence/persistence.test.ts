// src/persistence/persistence.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { JsonPersistenceStore } from './json-store.js';
import { EnvPersistenceWriter } from './env-writer.js';
import { NodeState } from './types.js';

vi.mock('fs/promises');

describe('Persistence Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JsonPersistenceStore', () => {
    const mockFilePath = './test-state.json';
    const sampleState: NodeState = {
      nodeName: 'master-01',
      nodeRole: 'master',
      activeAgents: ['phase-init', 'phase-explore']
    };

    it('should save node state to json file', async () => {
      const store = new JsonPersistenceStore(mockFilePath);
      await store.saveNodeState(sampleState);

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilePath,
        JSON.stringify(sampleState, null, 2),
        'utf8'
      );
    });

    it('should load node state from existing file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(sampleState));

      const store = new JsonPersistenceStore(mockFilePath);
      const state = await store.loadNodeState();

      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
      expect(state).toEqual(sampleState);
    });

    it('should return null if file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const store = new JsonPersistenceStore(mockFilePath);
      const state = await store.loadNodeState();

      expect(state).toBeNull();
    });
  });

  describe('EnvPersistenceWriter', () => {
    const mockFilePath = '.env';

    it('should format config map as key-value pairs and write to file', async () => {
      const writer = new EnvPersistenceWriter(mockFilePath);
      await writer.saveEnv({
        NODE_NAME: 'node-a',
        NODE_ROLE: 'worker',
        ACTIVE_AGENTS: 'phase-init'
      });

      const expectedContent = 'NODE_NAME=node-a\nNODE_ROLE=worker\nACTIVE_AGENTS=phase-init\n';
      expect(fs.writeFile).toHaveBeenCalledWith(mockFilePath, expectedContent);
    });
  });
});
