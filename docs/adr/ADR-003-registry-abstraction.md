# ADR-003: Model Registry Abstraction

## Context
The application catalog query and eligible model filtering was directly coupled to Ollama's daemon. As we scale to a distributed AI control plane, we will need to query models from other sources such as HuggingFace, local filesystems, or centralized agent hubs.

## Decision
We introduce the `ModelRegistry` (remote) and `LocalModelStore` (local) interfaces. All core installer operations communicate with these abstractions rather than calling Ollama endpoints directly.

## Alternatives Considered
- Direct HTTP coupling: Rejected as it blocks adding support for HuggingFace or custom model hubs.
- Conditional branches for vendor type inside services: Rejected as it violates Open-Closed Principle and Dependency Inversion.

## Consequences
- Complete decoupling from Ollama endpoints.
- Ready to support alternative registries by implementing the interface contracts.
- Simpler unit testing through mocking interfaces instead of HTTP queries.
