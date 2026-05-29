# Execution Cost

Use this file when the question is "what actually costs time here?"

## Likely Cost Centers

- Repeated allocation and deallocation.
- Hidden copies in string or collection operations.
- Expensive arithmetic in tight loops.
- Branch-heavy control flow with poor locality.
- Call overhead, abstraction layering, or parameter marshalling on tiny operations.

## Heuristics

- Evaluate expressions for side effects and order-of-evaluation hazards before optimizing them.
- Remove unnecessary work before trying to make necessary work faster.
- Hoist invariant computation out of loops when it clarifies the code and preserves correctness.
- Inline or fuse tiny wrappers only when evidence says call boundaries matter.
- Dense loop bodies and predictable control flow often matter more than isolated clever instructions.

## Review Prompts

- "Is the hot path dominated by arithmetic, memory traffic, branches, or calls?"
- "Can we change the loop shape, data order, or precomputation strategy instead of tweaking operators?"
- "Is short-circuit logic helping clarity and cost, or hiding order-dependent bugs?"
