# Technical Documentation: Development & Testing

## Project Commands

The project provides standard CLI scripting tasks using `pnpm`:

- **Run Tests**: `pnpm test` (Runs all Vitest suites in isolated non-watching mode).
- **Watch Tests**: `pnpm test:watch` (Launches vitest interactive UI watcher).
- **Test Coverage**: `pnpm test:coverage` (Computes test coverage using v8 engine).
- **Run Setup CLI**: `pnpm init-env` (Executes the node configuration wizard).

---

## Testing Conventions

1. **Isolation**: Always mock platform command execution (e.g. `execa`) and local filesystem accesses (`fs/promises`).
2. **Strategy Tests**: Strategies should be tested individually under `src/hardware/strategies/strategies.test.ts`. Mock `execa` returning standard output from the CLI utilities.
3. **Compatibility Tests**: Write tests in `src/compatibility/engine.test.ts` for each newly registered rule.
4. **Mocking Prompts**: Clack console prompts can be mocked using standard `vi.mock` configurations as shown in `src/cli/installer.test.ts`.

---

## Extending the Control Plane

- **Adding a GPU Strategy**: Implement `GpuDetectionStrategy` under `src/hardware/strategies/` and register it inside `HardwareDetector`.
- **Adding a Compatibility Rule**: Implement `CompatibilityRule` under `src/compatibility/rules.ts` and inject it to the `CompatibilityEngine` list inside `main()`.
- **Adding a Registry Provider**: Implement `ModelRegistry` under `src/registry/types.ts` and map options inside `main()`.
