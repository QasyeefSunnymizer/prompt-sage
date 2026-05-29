# Pressure Test 4: Slot Discipline

## Scenario

A change touches a plain admin settings form and a small parser used once during startup. A reviewer lists cache locality, SIMD, assembly inspection, and branch prediction concerns. There is no hot path, no correctness-critical numeric logic, and no evidence of performance trouble.

## Prompt

How should Sunny's Smart Synth respond?

## Expected Signals

- bounded slot pass
- no low-level escalation needed
- behavior and failure modes first
- representation only where it affects parser correctness
- evidence before performance claims
- suppress duplicate or irrelevant concerns

## Failure Signals

- invent low-level work
- recommend assembly inspection
- optimize UI glue
- treat every slot as mandatory output
- ignore no-hot-path evidence
