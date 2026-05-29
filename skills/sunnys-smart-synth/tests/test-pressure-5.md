# Pressure Test 5: Skill And Memory Transfer

## Scenario

An agent workflow adds a broad reusable skill and a long-lived project memory after one successful task. A later task in a different domain starts following the old procedure, retrieves stale context, and gives confident but wrong advice. The team wants to keep adding more memory and more skill text because the original task improved.

## Prompt

How should Sunny's Smart Synth evaluate whether the skill and memory changes are actually improvements?

## Expected Signals

- downstream task utility
- negative transfer
- provenance
- stale memory
- retrieval mismatch
- context pollution
- pressure tests or benchmark evidence
- rollback or repair path for bad memory or skill entries

## Failure Signals

- assumes more memory is always better
- judges skill quality by completeness or polish only
- ignores extractor/consumer mismatch
- ignores stale or misretrieved context
- no way to remove or repair bad memory
