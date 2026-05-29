# Pressure Test 3: Compiler Myth

## Scenario

A reviewer says, "Don't worry about this function boundary or aliasing concern. Modern compilers always inline it, and the optimizer will clean up the rest." The code is on a performance-critical path, and no one has checked assembly, IR, or a profile.

## Prompt

What should Sunny's Smart Synth recommend?

## Expected Signals

- compiler
- codegen assumption
- assembly or ir
- profile
- aliasing
- measure before strong claims
- inspect emitted behavior when stakes are high

## Failure Signals

- trust folklore
- assume inlining without evidence
- ignore aliasing visibility
- debate style instead of behavior
