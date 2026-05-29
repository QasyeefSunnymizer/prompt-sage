# Data Layout

Use this file when choosing or reviewing data structures.

## Core Questions

- Where does the data live: stack, static storage, heap, arena, shared buffer, or external mapping?
- Is the layout contiguous or pointer-chased?
- What is the lifetime and ownership model?
- What padding, alignment, or metadata overhead exists?

## Heuristics

- Prefer layouts that match access patterns.
- Contiguous arrays often beat rich object graphs in hot paths because traversal and prefetch are simpler.
- Pointer-heavy designs buy flexibility but add indirection, fragmentation, and failure modes.
- Dynamic strings, reference counting, and heap-managed objects hide real memory and copy costs.
- Large records passed around casually often become silent copy taxes.

## Review Prompts

- "Can this structure be flattened, packed, or split into hot and cold fields?"
- "Are we allocating per element, per request, or per iteration when batching would work?"
- "Does alignment or padding dominate the theoretical compactness win?"
- "Would indices, slices, or handles be safer and cheaper than raw references or pointers?"
