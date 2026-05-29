# Coding Workflow

Use this file when the agent needs to write or change code well, not merely discuss it.

## Core Questions

- What exact behavior must change?
- What invariants must remain true before, during, and after the change?
- What is the smallest clear change that can satisfy the requirement?
- Which data and control-flow choices dominate the solution shape?

## Heuristics

- Frame the task before editing code.
- Prefer the simplest implementation that makes behavior explicit.
- Let the data model and invariants drive the code structure.
- Delay abstraction until repeated structure or interface pressure justifies it.
- Separate required behavior from optional optimization.

## Review Prompts

- "Do we understand the task well enough to code the minimal correct change?"
- "Is the control flow obvious, or is the code hiding work behind indirection?"
- "Did we add abstraction because it helps, or because it feels sophisticated?"
