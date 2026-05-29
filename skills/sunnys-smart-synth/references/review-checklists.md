# Review Checklists

## Design Review

- Is the required behavior explicit?
- Are the main invariants visible in the structure?
- Is the chosen representation explicit and justified?
- Does data layout match the dominant read/write pattern?
- Are correctness constraints stronger than the proposed optimization?
- Are hidden allocation, copy, encoding, or ownership costs acceptable?

## Implementation Review

- Is the control flow easy to follow?
- Are side effects and failure modes obvious?
- Are integer width, signedness, floating-point, and conversion rules safe here?
- Are loops doing avoidable work?
- Are there branch, call, or indirection layers inside the hot path?
- Does the code rely on unspecified or easy-to-misread evaluation behavior?

## Debugging Review

- What facts are observed, and what is still assumption?
- Could representation, lifetime, aliasing, or conversion explain the bug?
- Are we changing code to learn something specific, or only guessing?

## Performance Review

- What exact bottleneck is being claimed?
- Is there measurement, or only intuition?
- Is the proposed change reducing memory traffic, branches, calls, or arithmetic cost in the real hot path?
- Could a simpler layout or algorithm beat a local micro-optimization?

## Escalation Rule

If the answer depends on emitted behavior, inspect generated output or a profiler trace before making strong claims.
