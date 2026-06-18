# ADR-005: Decoupled JSON Persistence

## Context
Node topology configuration (names, active agents, detected hardware, VRAM) was written to the `.env` configuration file as flat string formats. `.env` files are not database stores; they are designed for flat deployment flags. Structured profiles cannot be easily stored or queried as flat environment values.

## Decision
We decouple structured system state from flat environment configuration:
- System and node topology state (including nested `HardwareProfile` models) are written as a structured JSON object to `./easy-code-state.json` via a `PersistenceStore`.
- Deployment configuration variables (IPs, basic roles) remain in `.env` via an `EnvironmentWriter`.

## Alternatives Considered
- Storing JSON inside environment strings: Rejected as it is highly prone to encoding errors and difficult to parse.
- SQLite or heavier databases: Rejected to maintain a zero-dependency local footprint for the CLI setup.

## Consequences
- Structured metadata can be easily parsed and updated.
- Zero risk of polluting system environments.
- Cleaner environment file containing only simple deploy configurations.
