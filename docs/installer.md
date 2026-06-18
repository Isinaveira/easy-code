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
   └─► Instantiate NodeInstaller(detector, jsonStore, envWriter)
         │
         └─► run()
```

---

## Operations Flow

1. **Verify Dependencies**: Checks if `git`, `node`, and `ollama` are present in PATH.
2. **Collect Input**: Prompts user for Node Name, Node Role (Master/Worker), and Active Agents list using Clack console selectors.
3. **Detect Capabilities**: Invokes `HardwareDetector.detect()` to obtain the platform profile.
4. **Persist State**:
   - Saves a clean, structured `NodeState` (including the full nested `HardwareProfile`) into `./easy-code-state.json`.
   - Generates and writes flat cluster configuration variables to `.env` for compatibility with deployment scripts.
