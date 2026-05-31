---
name: sunnys-test-synth
description: Use when Codex has changed code, fixed a bug, reviewed behavior, prepared a release/build, or is about to claim something works and project verification may be needed. Informs Sunny what will be tested, runs the relevant commands itself, reads the output and exit codes, handles failures pragmatically, and reports evidence without claiming success from assumptions.
---

# Sunny's Test Synth

## Overview

Use this skill as the testing and verification companion to Sunny's Smart Synth. Keep SSS's rule: claims fail closed until fresh evidence is checked.

## Operating Loop

1. Identify the claim that needs proof: build works, tests pass, bug is fixed, UI renders, CLI route works, regression is absent, or release artifact builds.
2. Pick the narrowest useful verification first, then broaden when the blast radius warrants it.
3. Tell Sunny what you are about to run and why, in one short update.
4. Run the command yourself. Do not ask Sunny to run local verification unless blocked by permissions, missing credentials, unavailable hardware, or a genuinely interactive manual acceptance step.
5. Read the exit code and the relevant output. A command is not passing until the evidence is opened and checked.
6. If it fails, treat the failure as task context: inspect, fix if in scope, and rerun the smallest proof command.
7. Before final response, state the exact commands run and the observed result. Mention skipped/manual checks plainly.

## Command Selection

- For JavaScript/Node packages, prefer the repo scripts in `package.json`: `npm test`, targeted `node --test ...`, `npm run build...`, or the existing script closest to the claim.
- For Rust crates, use the crate manifest path already used by the repo: `cargo test --manifest-path ...`, `cargo build --manifest-path ...`, and `cargo fmt` when edits touched Rust.
- For UI/TUI work, combine render/unit tests with a build, then do a smoke command when possible. If a true interactive visual check is needed, say so explicitly after automated checks pass.
- For docs-only edits, run link/generation checks only if the repo provides them. Otherwise report that no executable verification exists and explain the inspection performed.
- For risky or broad changes, run both targeted tests and the full project test script.

## Permission Policy

- If sandboxing blocks an important verification command, rerun it with the required escalation request instead of stopping early.
- If network or install access is needed, ask through the tool escalation path and state the reason.
- Do not use destructive cleanup to make tests pass. Remove only generated artifacts you created, and verify paths before recursive deletion.

## Reporting

Use concise evidence:

```text
Verified:
- npm test: pass, 39 tests
- cargo test --manifest-path tui/Cargo.toml: pass, 8 tests
- npm run build:tui: pass, release binary built
```

If verification is incomplete, say exactly which claim remains unverified and why.
