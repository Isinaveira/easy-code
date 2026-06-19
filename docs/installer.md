# Technical Documentation: CLI Installer

## Design Overview
The CLI Installer acts purely as an orchestrator. It contains no core business rules or hardware calculation logic.

Dependencies are instantiated at the entry point (`index.ts` or `installer.ts` `main()`), composed, and injected into the orchestrator class constructor (Composition Root pattern).

---

## Dependency Composition

```
[Entry point: main()]
   │
   ├─► Instantiate CpuStrategy / NvidiaStrategy / etc.
   ├─► Instantiate HardwareDetector(strategies)
   ├─► Instantiate JsonPersistenceStore()
   ├─► Instantiate EnvPersistenceWriter()
   │
   └─► Render Ink React App component tree
         │
         └─► AppContent (Wizard Screens navigation)
```

---

## Operations Flow

1. **Verify Dependencies**: Confirms `git`, `node`, and `ollama` are present in PATH.
2. **Setup Wizard Steps**:
   - **Step 1 (NODE_NAME)**: Input the hostname/name for this node.
   - **Step 2 (NODE_ROLE)**: Select 'master' or 'worker' role.
   - **Step 3 (AGENT_SELECTION)**: Check/uncheck agents to run (checklist only).
   - **Step 4 (HARDWARE_DETECTION)**: Profile node resources and query LLMFit health/catalogs.
   - **Step 5 (MODEL_SELECTION)**: Select model configuration one-by-one from the fit table.
   - **Step 6 (SAVE_CONFIG)**: Save configuration and run `ModelSelector` dynamically.
3. **Persist State**:
   - Runs `ModelSelector` to resolve the final models for all selected agents.
   - Saves `NodeState` (including `modelAssignments` and nested `HardwareProfile`) into `./easy-code-state.json`.
   - Writes environment configuration to `.env` (including role, active agents list, and specific `MODEL_AGENT_NAME` variables).

