# Rust CLI

This folder contains the primary `prompt-sage` CLI implementation.

## Current Status
- CLI entrypoint:
  - `"/sage [lite|full|ultra|master|roleplay]" "text"`
  - `self-update [--dry-run]`
- Mode parser/state and transform pipeline with JS snapshot parity.
- Safety fallback behavior carried over.
- Unit tests for parser, safety fallback, code-block preservation, and CLI shape.
- Fixture-based output parity checks in `tests/parity.rs`.

## Build

```bash
cargo build --release --manifest-path rust/prompt-sage-rs/Cargo.toml
```

The release binary is written to `rust/prompt-sage-rs/target/release/prompt-sage`.
