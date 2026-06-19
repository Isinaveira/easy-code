// src/agents/scoring/engine.ts
import { EnrichedModel } from '../../registry/hf/types.js';
import { CognitiveProfile } from '../types.js';

export function calculateScore(model: EnrichedModel, profile: CognitiveProfile): number {
  // Normalize signals to a 0-100 scale roughly
  
  // Quality / Reasoning
  const quality = model.capabilities.reasoning_proxy;
  
  // Speed: Cap TPS at 100 for normalization purposes
  const speed = Math.min(model.tps > 0 ? (model.tps / 100) * 100 : 50, 100);
  
  // Context: Cap at 128k for normalization
  const context = Math.min((model.context_length / 128000) * 100, 100);
  
  // Memory efficiency: lower is better. 
  // Let's assume 32GB is 0 score, 0GB is 100 score.
  const memory_efficiency = Math.max(100 - (model.memory_required_gb / 32) * 100, 0);

  // Stability: downloads + likes
  // Normalize downloads: 1 million downloads = 100 score
  const dlScore = Math.min((model.downloads / 1000000) * 100, 100);
  const likesScore = Math.min((model.likes / 10000) * 100, 100);
  const stability = (dlScore * 0.7) + (likesScore * 0.3);

  let finalScore = 0;

  switch (profile) {
    case 'EXPLORER':
      finalScore = (context * 0.40) + (speed * 0.30) + (quality * 0.20) + (memory_efficiency * 0.10);
      break;
      
    case 'ORCHESTRATOR':
      finalScore = (quality * 0.40) + (context * 0.30) + (speed * 0.30); // Base sum
      if (model.capabilities.tool_use) finalScore += 20; // Fuerte bonus
      break;

    case 'PLANNER':
      finalScore = (quality * 0.50) + (context * 0.30) + (speed * 0.20);
      break;

    case 'ARCHITECT':
      finalScore = (quality * 0.55) + (context * 0.25) + (speed * 0.20);
      finalScore += stability * 0.15; // Bonus
      break;

    case 'CODER':
      finalScore = (quality * 0.40) + (speed * 0.30) + (context * 0.30);
      if (model.capabilities.coding) finalScore += 15;
      if (model.capabilities.tool_use) finalScore += 10;
      break;

    case 'VALIDATOR':
      finalScore = (quality * 0.45) + (context * 0.35) + (speed * 0.20);
      // Robustness bonus (stability proxy)
      finalScore += stability * 0.10;
      break;

    case 'LIGHTWEIGHT':
      finalScore = (speed * 0.60) + (memory_efficiency * 0.40);
      break;

    case 'SECRETARY':
      finalScore = (speed * 0.70) + (stability * 0.30);
      break;

    default:
      finalScore = (quality * 0.33) + (speed * 0.33) + (context * 0.34);
  }

  // Bonus general arquitectura
  if (model.runtime.is_moe) {
    finalScore += 5;
  }

  // Cap final score
  return Math.min(Math.max(finalScore, 0), 100);
}
