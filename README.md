# easy-code ⚙️

> **Distributed AI Agent Node Orchestrator & Inference Control Plane**

**easy-code** is a clean, modular control plane engineered to run distributed AI agents and manage local inference nodes. It automatically analyzes system architectures, evaluates model execution compatibility, manages catalogs, and configures cluster nodes.

Built on **Clean Architecture**, **SOLID Principles**, and **Strict Dependency Inversion**, it is designed to scale from a single local setup to a distributed network of AI model registries.

---

## 🏗️ Architectural Layout

The codebase is structured under clean boundaries:

```
src/
├── hardware/         # Hardware capability discovery (OS, CPU, GPU, unified Memory)
├── compatibility/    # Rule-based model compatibility evaluations
├── registry/         # Decoupled model discovery (local/remote catalog abstractions)
├── agents/           # Phase requirements matrix and cognitive selectors
├── persistence/      # Structured JSON state and deployment configuration stores
└── cli/              # UI Prompt orchestration and composition roots
```

For detailed insights into design decisions, explore our [Architecture Documentation](docs/architecture.md) and [Architecture Decision Records (ADRs)](docs/adr/).

---

## 🚀 Getting Started

### Installation

Install dependencies using `pnpm`:

```bash
pnpm install
```

### Initializing Environment

Run the node setup wizard to configure node topology, agents, and detect hardware:

```bash
pnpm run init-env
```

### Testing

Verify the architecture and run all unit/integration tests with:

```bash
pnpm test
```

For coverage metrics:

```bash
pnpm test:coverage
```

---

## 📄 Documentation Index

- [Architectural Overview](docs/architecture.md)
- [Hardware Detection Strategy](docs/hardware.md)
- [Compatibility Rules Engine](docs/compatibility.md)
- [Model Registry Integration](docs/ollama.md)
- [Node Orchestrator](docs/installer.md)
- [Development and Testing Guide](docs/development.md)
