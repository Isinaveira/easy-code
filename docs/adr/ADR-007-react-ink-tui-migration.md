# ADR-007: Ink + React TUI Migration and Adaptive Layouts

## Context
The legacy installer used a procedural command-line prompt flow (`@clack/prompts`) which did not support interactive dashboards, scrollable table layouts, paginated selection modals, or dynamic layout adjustment. As easy-code grows into a multi-step installation wizard and dynamic agent monitor, a component-driven, state-based, and adaptive presentation layer is required.

## Decision
We migrate the entire command-line interface to a modern TUI powered by **Ink + React**:
- **State-Driven Routing**: Screen state and history are managed via React Context + Reducers.
- **Custom Interactive Inputs**: TextInput, SelectInput, and MultiSelectInput components built using Ink's `useInput`.
- **Sequential Wizard Steps**: Standardized 6-step flow (`NODE_NAME` -> `NODE_ROLE` -> `AGENT_SELECTION` -> `HARDWARE_DETECTION` -> `MODEL_SELECTION` -> `SAVE_CONFIG`).
- **Adaptive Layout System**: Implemented a custom `useTerminalWidth` hook listening to `stdout` resize events to stretch layout boxes dynamically and toggle extra columns (`TPS`, `FIT`) in the model selection table when width >= 92.

## Alternatives Considered
- Bleeding-edge terminal rendering libraries (e.g. blessed, blessed-react): Rejected due to lack of maintenance, poor TypeScript typing support, and installation footprint.
- Maintaining Clack prompts: Rejected as they are purely procedural and cannot render complex tables or modal layouts.

## Consequences
- Highly component-based, reusable, and testable user interface layer.
- Perfect terminal width fitting with automatic column expansion, preventing line wraps.
- Extensible architecture ready for settings editors, live dashboards, and agent monitors.
