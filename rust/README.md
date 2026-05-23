# Rust Migration Scaffold

This folder contains phase-1 scaffolding for a Rust migration of `prompt-sage`.

## Current Status
- CLI entrypoint with command-shape parity:
  - `"/sage [lite|full|ultra|master|roleplay]" "text"`
  - `self-update [--dry-run]` (wiring placeholder)
- Basic mode parser/state and transform pipeline.
- Safety fallback behavior carried over.
- Unit tests for parser and safety fallback.

## Phase-2 Targets
- Implement platform-specific `self-update` execution parity.
- Add robust literal preservation parity (code-block protection).
- Expand snapshot fixtures for output-compatibility checks against JS version.
- Package Rust binary for existing distribution channels.
