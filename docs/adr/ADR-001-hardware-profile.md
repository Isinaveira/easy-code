# ADR-001: Hardware Profile Contract

## Context
Downstream layers like model selection, routing, and compatibility validation require information regarding the underlying node resources. Passing raw memory variables or bare VRAM numbers is fragile and loses hardware platform context.

## Decision
We introduce a unified `HardwareProfile` entity defining the OS, CPU architecture and core counts, GPU vendor, models, VRAM capacities, and system memory limits. All hardware strategies parse their values directly into this profile type.

## Alternatives Considered
- Passing raw numbers (`vramGb` only): Rejected as it fails to capture CPU architecture or GPU vendor characteristics, which are needed for advanced compatibility checks.
- Native system calls directly in controllers: Rejected as it violates Separation of Concerns and DIP.

## Consequences
- Clean, strongly typed contract for all downstream systems.
- Unified accelerator detection (`cuda` | `metal` | `rocm` | `cpu`).
