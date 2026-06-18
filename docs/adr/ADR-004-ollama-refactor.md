# ADR-004: Ollama Service Responsibility Refactoring

## Context
The single `ollama.ts` service contained multiple distinct responsibilities: HTTP connection management, local metadata mapping, static registry definitions, and cross-catalog eligibility filtering. This violated Single Responsibility (SRP).

## Decision
We split the Ollama service into four single-responsibility files:
- `client.ts`: Connection handler.
- `installed.ts`: Local model store mapper.
- `registry.ts`: Hub registry mapping.
- `types.ts`: API contracts.

## Alternatives Considered
- Keeping a single file: Rejected because it makes it difficult to maintain, test, or modify separate concerns (e.g. changing HTTP headers without breaking the static hub list).

## Consequences
- Clean, focused, easily testable components.
- Modular changes can be made without regressions.
