// src/compatibility/rules.ts
import { HardwareProfile } from '../hardware/index.js';
import { CompatibilityRule, CompatibilityResult, ModelDescriptor } from './types.js';

export class VramRule implements CompatibilityRule {
  name = 'VRAM Compatibility Rule';

  evaluate(model: ModelDescriptor, profile: HardwareProfile): CompatibilityResult {
    if (profile.accelerator === 'cpu') {
      const safetyMargin = 4;
      const effectiveMemoryGb = profile.memory.totalGb - safetyMargin;

      if (model.sizeGb > effectiveMemoryGb) {
        return {
          compatible: false,
          reason: `Model size (${model.sizeGb} GB) exceeds effective CPU memory (${effectiveMemoryGb} GB) with safety margin of ${safetyMargin} GB.`,
          estimatedVramNeededGb: model.sizeGb
        };
      }

      return { compatible: true };
    }

    // GPU mode (cuda, metal, rocm)
    const gpuVram = profile.gpu?.vramGb || 0;
    if (model.sizeGb > gpuVram) {
      return {
        compatible: false,
        reason: `Model size (${model.sizeGb} GB) exceeds available VRAM (${gpuVram} GB).`,
        estimatedVramNeededGb: model.sizeGb
      };
    }

    return { compatible: true };
  }
}
