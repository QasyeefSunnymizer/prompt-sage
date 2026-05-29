# Correctness And Clarity

Use this file when implementation quality matters more than just getting something to run once.

## Core Questions

- What assumptions is the code making about type, width, ordering, ownership, or lifetime?
- What side effects are visible, and in what order can they happen?
- What inputs or states are invalid, and how should failure surface?
- Can another engineer explain the behavior without reverse-engineering hidden state?

## Heuristics

- Make invariants explicit in code shape, not only in comments.
- Reduce surprising side effects and order-dependent expressions.
- Prefer names and structures that reveal behavior boundaries.
- Debug from observable facts first, then test the most plausible assumptions.
- If a value conversion or boundary case matters, make it impossible to overlook.

## Review Prompts

- "What could be true here that the code is silently assuming?"
- "Could evaluation order, conversion, or aliasing change the result?"
- "Is this code clear because it is simple, or only familiar to its author?"
