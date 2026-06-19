import { ModelSelector } from '../src/agents/ModelSelector.js';
import { AgentProfile } from '../src/agents/types.js';

const agents: AgentProfile[] = [
  'agentic-orchestrator',
  'phase-init',
  'phase-explore',
  'phase-propose',
  'phase-spec',
  'phase-design',
  'phase-tasks',
  'phase-apply',
  'phase-verify',
  'phase-archive',
  'phase-onboard',
  'consensus-judge-a',
  'consensus-judge-b',
  'consensus-fixer'
];

async function run() {
  const selector = new ModelSelector();
  const results: Record<string, string[]> = {};

  for (const agent of agents) {
    try {
      console.log(`Querying for ${agent}...`);
      const models = await selector.getCandidatesForAgent(agent);
      results[agent] = models.slice(0, 5).map(m => m.name);
    } catch (e) {
      console.error(`Error querying for ${agent}:`, e.message);
      results[agent] = [];
    }
  }

  console.log('\n--- TOP 5 MODELS PER AGENT ---\n');
  
  // Create a reverse map: Model -> Agents
  const modelToAgents: Record<string, string[]> = {};
  
  for (const [agent, models] of Object.entries(results)) {
    console.log(`${agent}:`);
    models.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m}`);
      if (!modelToAgents[m]) modelToAgents[m] = [];
      modelToAgents[m].push(agent);
    });
    console.log('');
  }

  console.log('\n--- SHARED MODELS ACROSS AGENTS ---\n');
  for (const [model, modelAgents] of Object.entries(modelToAgents)) {
    if (modelAgents.length > 1) {
      console.log(`Model: ${model}`);
      console.log(`Used by (${modelAgents.length}): ${modelAgents.join(', ')}\n`);
    }
  }
}

run().catch(console.error);
