# Compiler Reality

Use this file when people start assuming the compiler will rescue the design.

## Defaults

- Modern compilers are strong, not omniscient.
- Optimization quality depends on language rules, aliasing visibility, escape behavior, inlining boundaries, target architecture, and build settings.
- If a performance or correctness claim depends on emitted code, inspect emitted code.

## Heuristics

- Do not micro-optimize against an imaginary compiler model.
- Do not dismiss low-level inspection when the code sits on a hot path or correctness boundary.
- Compare versions, flags, or formulations when choosing among plausible implementations.
- Measure before and after. Assembly inspection without timing can still miss the real bottleneck.

## Review Prompts

- "What assumption about codegen is this proposal making?"
- "Can the optimizer see through this abstraction boundary?"
- "Would different data layout or aliasing information unlock better code than manual cleverness?"
- "Should we inspect assembly, IR, bytecode, object layout, or profile output here?"
