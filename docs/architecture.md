# Technical Documentation: Architectural Overview

## Design Principles
The refactoring of **easy-code** has transformed a monolithic setup script into a decoupled, extensible, and clean control plane for AI agents and local inference nodes. The architecture strictly adheres to:

1. **Clean Architecture**: Separation of concerns into domain, infrastructure, application services, and presentation layers.
2. **SOLID Principles**: Especially Single Responsibility (SRP), Open-Closed (OCP), and Dependency Inversion (DIP).
3. **Spec-Driven & Test-Driven Development (SDD/TDD)**: Standard interfaces and rules are tested thoroughly in isolation.
4. **Composition over Inheritance**: Modular strategies and compatibility rules are composed dynamically.

---

## Architectural Layers

```
┌────────────────────────────────────────────────────────┐
│                   CLI / TUI Layer                      │
│        (installer.ts, App.tsx, screens wizard)         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Application Services                 │
│        (ModelSelector, selectBestModelForAgent)        │
└───────────────┬───────────────────────────┬────────────┘
                ▼                           ▼
┌───────────────────────────┐   ┌────────────────────────┐
│    Compatibility Layer    │   │     Registry Layer     │
│   (CompatibilityEngine)   │   │     (ModelRegistry)    │
└───────────────┬───────────┘   └───────────┬────────────┘
                │                           │
                ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                      Domain Model                      │
│            (HardwareProfile, ModelDescriptor)          │
└────────────────────────────────────────────────────────┘
```

---

## Module Decoupling and Dependency Flow

1. **Hardware Module (`src/hardware/`)**:
   - Discovers operating system capabilities, CPU specs, memory capacity, and GPU architectures.
   - Outputs a unified `HardwareProfile` domain entity.
2. **Compatibility Module (`src/compatibility/`)**:
   - Assesses if a particular model configuration can run safely on a `HardwareProfile`.
   - Uses composable validation rules (e.g., `VramRule`).
3. **Registry Module (`src/registry/`)**:
   - Abstraction over remote model catalogs (`LlmfitRegistry`, `OllamaRegistry`) and local downloads.
   - Completely decouples the system from direct Ollama endpoints.
4. **Agents Module (`src/agents/`)**:
   - Compiles requirements, maps profiles (`FAST`, `BALANCED`, `QUALITY`, `CODING`), and executes queries with automated fallback sequencing using `ModelSelector`.
5. **Persistence Module (`src/persistence/`)**:
   - Separates cluster environment properties (`.env`) from structured node metadata (`easy-code-state.json`).
   - Integrates model assignments persistent tracking.
