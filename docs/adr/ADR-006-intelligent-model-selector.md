# ADR-006: Intelligent Model Selector and Fallback Sequencing

## Context
Each AI agent in the easy-code orchestrator has specific execution requirements (e.g. speed, reasoning depth, coding capabilities, VRAM limits). Hardcoding model selections or relying on static maps in the UI coupling node configuration violates core architectural separation of concerns. Additionally, if the preferred model is not available or fit level constraints are too tight, a robust query fallback sequence is required to keep the system operational.

## Decision
We introduce a centralized `ModelSelector` service that automatically maps agent profiles to execution profiles and queries the `llmfit` API dynamically:
- **Agent Profiles**: Maps agents to `FAST`, `BALANCED`, `QUALITY`, or `CODING` profiles, each applying custom query filters (`sort`, `min_fit`, `use_case`).
- **Dynamic API Queries**: Queries are compiled and sent to the `llmfit` REST daemon dynamically.
- **Fallback Escalation**: If a query returns zero candidates, the selector automatically escalates:
  1. Try `use_case` = `General Purpose` (if CODING).
  2. Drop `use_case` constraint.
  3. Lower `min_fit` from `good` to `fair`.
  4. Remove `min_fit` constraint entirely.
- **Traceability**: All model selection decisions are logged to a local structured file `easy-code-trace.json`.

## Alternatives Considered
- Direct registry queries inside screens: Rejected as it couples the UI to remote catalog logic and violates the Single Responsibility Principle.
- Hardcoded fallback lists: Rejected as it fails to leverage dynamic real-time catalog capability data returned by `llmfit`.

## Consequences
- Decouples UI layers and agents from hardware, quantization, and model size details.
- Full traceability of automated selection steps in the local trace log.
- High resilience to model unavailability through systematic fallback sequencing.
