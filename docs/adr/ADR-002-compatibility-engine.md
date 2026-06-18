# ADR-002: Rule-Based Compatibility Engine

## Context
Compatibility checks were scattered across multiple utility files. Decisions were hardcoded to direct file size limits. Adding checks for quantization levels, thermal limits, or compute architecture would require rewriting core utility functions.

## Decision
We introduce a rule-based `CompatibilityEngine` that runs a candidate model against an injected array of `CompatibilityRule` implementations. The standard `VramRule` checks VRAM constraints and applies appropriate fallback OS RAM safety thresholds.

## Alternatives Considered
- Direct utility function validation: Rejected because it makes it difficult to add new criteria without violating the Open-Closed Principle.
- Database query filtering: Rejected as it increases infrastructure overhead unnecessary for a CLI node controller.

## Consequences
- High extensibility (Open-Closed compliance).
- Modular rule testing.
- Single Source of Truth for model eligibility.
