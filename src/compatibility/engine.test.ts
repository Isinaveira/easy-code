// src/compatibility/engine.test.ts
import { describe, expect, it } from 'vitest';
import { CompatibilityEngine } from './engine.js';
import { VramRule } from './rules.js';
import { HardwareProfile, CpuInfo, MemoryInfo } from '../hardware/index.js';
import { ModelDescriptor } from './types.js';

describe('Compatibility Engine and Rules', () => {
  const dummyCpu: CpuInfo = { cores: 8, model: 'Intel i7', architecture: 'x64' };
  const dummyMemory: MemoryInfo = { totalGb: 16 };

  describe('VramRule', () => {
    const vramRule = new VramRule();

    it('should be compatible if model size is less than GPU VRAM', () => {
      const profile: HardwareProfile = {
        os: 'win32',
        cpu: dummyCpu,
        gpu: { vendor: 'nvidia', model: 'RTX 3070', vramGb: 8 },
        memory: dummyMemory,
        accelerator: 'cuda'
      };

      const model: ModelDescriptor = { name: 'llama3:8b', sizeGb: 4.7 };
      const result = vramRule.evaluate(model, profile);

      expect(result.compatible).toBe(true);
    });

    it('should not be compatible if model size exceeds GPU VRAM', () => {
      const profile: HardwareProfile = {
        os: 'win32',
        cpu: dummyCpu,
        gpu: { vendor: 'nvidia', model: 'RTX 3070', vramGb: 8 },
        memory: dummyMemory,
        accelerator: 'cuda'
      };

      const model: ModelDescriptor = { name: 'llama3.1:70b', sizeGb: 43.0 };
      const result = vramRule.evaluate(model, profile);

      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('exceeds available VRAM');
    });

    it('should apply 4GB safety margin on CPU fallback mode and evaluate against system memory', () => {
      const profile: HardwareProfile = {
        os: 'linux',
        cpu: dummyCpu,
        gpu: null,
        memory: { totalGb: 16 },
        accelerator: 'cpu'
      };

      // In CPU mode with 16GB, effective VRAM is 16 - 4 = 12GB.
      // 9.5GB model should be compatible (9.5 <= 12)
      const compatibleModel: ModelDescriptor = { name: 'gemma2:9b', sizeGb: 9.5 };
      expect(vramRule.evaluate(compatibleModel, profile).compatible).toBe(true);

      // 13GB model should not be compatible (13 > 12)
      const incompatibleModel: ModelDescriptor = { name: 'huge-model:13b', sizeGb: 13.0 };
      const result = vramRule.evaluate(incompatibleModel, profile);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('exceeds effective CPU memory');
    });
  });

  describe('CompatibilityEngine orchestration', () => {
    it('should evaluate model against all registered rules', () => {
      const profile: HardwareProfile = {
        os: 'win32',
        cpu: dummyCpu,
        gpu: { vendor: 'nvidia', model: 'RTX 3070', vramGb: 8 },
        memory: dummyMemory,
        accelerator: 'cuda'
      };

      const model: ModelDescriptor = { name: 'llama3:8b', sizeGb: 4.7 };
      const engine = new CompatibilityEngine([new VramRule()]);

      const isCompatible = engine.checkCompatibility(model, profile);
      expect(isCompatible.compatible).toBe(true);
    });

    it('should filter compatible models from a catalog', () => {
      const profile: HardwareProfile = {
        os: 'win32',
        cpu: dummyCpu,
        gpu: { vendor: 'nvidia', model: 'RTX 3060', vramGb: 6 },
        memory: dummyMemory,
        accelerator: 'cuda'
      };

      const catalog: ModelDescriptor[] = [
        { name: 'phi3:mini', sizeGb: 2.2 },
        { name: 'gemma2:9b', sizeGb: 9.5 },
        { name: 'mistral:7b', sizeGb: 4.1 }
      ];

      const engine = new CompatibilityEngine([new VramRule()]);
      const compatible = engine.filterCompatible(catalog, profile);

      expect(compatible).toHaveLength(2);
      expect(compatible.map(m => m.name)).toContain('phi3:mini');
      expect(compatible.map(m => m.name)).toContain('mistral:7b');
      expect(compatible.map(m => m.name)).not.toContain('gemma2:9b');
    });
  });
});
