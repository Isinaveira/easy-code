// src/persistence/env-writer.ts
import fs from 'fs/promises';
import { EnvironmentWriter } from './types.js';

export class EnvPersistenceWriter implements EnvironmentWriter {
  private filePath: string;

  constructor(filePath = '.env') {
    this.filePath = filePath;
  }

  async saveEnv(config: Record<string, string>): Promise<void> {
    const content = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

    await fs.writeFile(this.filePath, content);
  }
}
