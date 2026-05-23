# Rust Migration Scaffold

This folder contains phase-1 scaffolding for a Rust migration of `prompt-sage`.

## Current Status
- CLI entrypoint with command-shape parity:
  - `"/sage [lite|full|ultra|master|roleplay]" "text"`
  - `self-update [--dry-run]`
- Basic mode parser/state and transform pipeline.
- Safety fallback behavior carried over.
- Unit tests for parser, safety fallback, and code-block preservation.
- Fixture-based parity mode checks in `tests/parity.rs`.

## Next Targets
- Expand snapshot fixtures for output text compatibility against JS behavior.
- Add tokenizer-based token-savings benchmarking for Rust outputs.
- Move package manager installers to consume Rust binaries progressively.
