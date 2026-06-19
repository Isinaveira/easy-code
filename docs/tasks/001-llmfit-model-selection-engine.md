# TASK-001: Motor de Selección de Modelos vía llmfit API

**Status:** ✅ Complete  
**Branch:** `feature/model-selector-tests`  
**Created:** 2026-06-19  
**Completed:** 2026-06-19  

---

## Objective

Implement a high-density interactive model selection screen in the CLI wizard (Ink/React TUI) that queries the local `llmfit` API to recommend models based on detected hardware and agent cognitive requirements.

## Context

The installer wizard needed to move from a mocked/static model catalog to real-time model recommendations. The `llmfit` daemon exposes a REST API at `localhost:8787` that analyzes the user's hardware (CPU, GPU, RAM) and returns scored, ranked model candidates with detailed telemetry.

## Scope

### 1. llmfit API Integration
- **LlmfitClient** (`src/registry/llmfit/client.ts`): HTTP client targeting `/api/v1/models/top` with configurable query parameters.
- **ModelSelector** (`src/agents/ModelSelector.ts`): Maps each agent profile (`FAST`, `BALANCED`, `QUALITY`, `CODING`) to specific query filters (`sort`, `min_fit`, `use_case`, etc.) with a 4-step fallback escalation sequence when no candidates are found.

### 2. Daemon Lifecycle
- **installer.ts** (`src/cli/installer.ts`): Added `llmfit` to critical dependency checks. If the daemon is offline, it auto-starts via `llmfit serve --host 0.0.0.0 --port 8787` and polls `/health` until ready.

### 3. TUI Model Selection Screen
- **ModelSelectionScreen.tsx** (`src/tui/screens/ModelSelectionScreen.tsx`):
  - Three static blocks: Node hardware profile, Agent requirements, Interactive table.
  - Aligned columns: Model Name (36ch, provider namespace stripped), Params, Score, Memory, Context (K/M formatted), TPS, Fit Status.
  - Fit rendering: `✔ Perfect (GPU)` in green, `Good (GPU)` in yellow (no warning icon).
  - Scrollable list with `↑/↓` navigation, `Enter` to confirm, `Esc/b` to go back.

### 4. Telemetry Inspection Mode
- Pressing `i` hides the table and displays a detailed telemetry panel with **all** API fields grouped as:
  - **Architecture**: `parameter_count`, `params_b`, `is_moe`, `category`, `provider`, `license`, `release_date`
  - **Quantization**: `best_quant`
  - **Memory**: `memory_required_gb`, `total_memory_gb`, `utilization_pct`, `memory_available_gb`, `moe_offloaded_gb`
  - **Context**: `context_length`, `use_case`
  - **Capabilities**: `capabilities`, `supports_tp`
  - **Score Breakdown**: `score`, `score_components.{context, quality, speed, fit}`
  - **Runtime**: `runtime_label`, `runtime`, `run_mode_label`, `run_mode`
  - **Notes**: `notes[]`
  - **Sources**: `gguf_sources[]`

### 5. Data Integrity Fix (Critical)
- **Root cause found**: `LlmfitClient.getModels()` was cherry-picking ~8 fields from the API response and silently discarding the rest. Fields like `context_length`, `is_moe`, `fit_label`, `notes`, `best_quant`, etc. were never mapped to the `ModelDescriptor`.
- **Fix**: Replaced the selective mapping with a full passthrough of all API fields. Expanded `ModelDescriptor` type from 14 to 40+ fields.

## Key Decisions

| Decision | Rationale |
|---|---|
| `memory_required_gb` takes priority over `sizeGb` for VRAM estimation | The API's memory estimate accounts for quantization and runtime overhead, more accurate than raw model size |
| Provider namespace stripped only in table view, preserved in data | Table readability vs. data integrity — the full name is available in inspection mode |
| Context formatted as K/M in table, raw tokens in detail | Terminal column width constraint vs. precision when inspecting |
| `toMatchObject` in client tests instead of `toEqual` | The descriptor now includes all API fields with `undefined` defaults — strict equality would require listing every field in every test |

## Commits

| Hash | Message |
|---|---|
| `c611353` | feat: query llmfit api dynamically per agent requirements and remove mocked models |
| `7594f72` | fix: point llmfit client to correct models/top endpoint path |
| `261c31a` | feat: add llmfit as critical dependency and start serve daemon automatically |
| `4fb660e` | fix: map selector profiles to valid llmfit sort parameter values |
| `a7497d4` | feat: implement high density model table layout and interactive telemetry inspection mode |
| `bd174c0` | feat(tui): enrich model telemetry detailed inspection panel |
| `1574d82` | fix(llmfit): passthrough all API fields instead of cherry-picking |

## Files Modified

| File | Change |
|---|---|
| `src/registry/llmfit/client.ts` | Full API field passthrough, correct endpoint |
| `src/registry/llmfit/registry.test.ts` | Test assertions adapted |
| `src/compatibility/types.ts` | `ModelDescriptor` expanded to 40+ fields |
| `src/agents/ModelSelector.ts` | Agent profile → query filter mapping, fallback chain |
| `src/agents/ModelSelector.test.ts` | Full selector test coverage |
| `src/tui/screens/ModelSelectionScreen.tsx` | Table layout, inspection panel, scrolling |
| `src/tui/screens/HardwareDetectionScreen.tsx` | Dynamic per-agent model fetching |
| `src/tui/types.ts` | `availableModelsByAgent` in TUI state |
| `src/tui/state/reducer.ts` | State initialization and action handler |
| `src/cli/installer.ts` | `llmfit` critical dep check + daemon auto-start |

## Verification

- **85/85 tests pass** (`pnpm test`)
- Manual verification via `pnpm init-env` confirming table values match API output
- Inspection mode (`i` key) displays all fields correctly

## Lessons Learned

1. **Never cherry-pick API fields in a client layer.** Pass everything through and let the consumer decide what to render. The mapping caused silent data loss that was hard to trace because the UI still rendered (with wrong/default values).
2. **The llmfit API uses `context_length`, not `contextWindow` or `context_window`.** Always verify the actual response shape before writing field accessors.
3. **Valid sort parameters for `/api/v1/models/top`**: `score`, `tps`, `params`, `mem`, `ctx`, `date`, `use_case`. Using `speed` or `quality` causes a 422 validation error.
