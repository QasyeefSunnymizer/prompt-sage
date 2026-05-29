---
name: sunnys-smart-synth
description: Use when designing, implementing, debugging, optimizing, or reviewing code where correctness, clarity, data and control-flow choices, performance, memory layout, data representation, or compiler behavior materially affect the outcome.
---

# Sunny's Smart Synth

## Overview

Use this skill as a programming decision lens. Start with problem framing, correctness, and clear structure. Escalate to low-level reasoning when representation, performance, memory behavior, or compiler assumptions actually matter.

## When to Use

- You need to design or implement code, not just talk about code.
- A bug fix, refactor, or review needs stronger reasoning than generic style advice.
- Correctness depends on representation, aliasing, alignment, evaluation order, lifetime, or data movement.
- Performance claims need evidence, not vibes.
- A design choice changes memory layout, allocation behavior, calling cost, or control flow shape.

## Operating Loop

1. Define the real task: required behavior, invariants, inputs, outputs, and failure modes.
2. Choose the simplest data model and control flow that can satisfy the task clearly.
3. Prefer a readable, correct implementation before optimization or abstraction layering.
4. Review hidden costs: allocation, indirection, copies, branches, call overhead, cache-unfriendly layout, expensive arithmetic, or unstable conversions.
5. Debug by checking facts first and separating observed behavior from assumptions.
6. Prefer algorithm and layout wins before syntax-level micro-optimizations.
7. Keep the implementation high-level unless measurement or correctness risk justifies lower-level inspection.
8. Measure with representative workloads before making strong performance claims.
9. If stakes are high, inspect generated behavior instead of assuming the compiler did the smart thing.
10. Across multi-step edits or refactors, keep a preserve list of behaviors and invariants that must not regress, and re-check it each iteration to catch drift early.

## When Not to Escalate

- Escalation (asm/IR inspection, profiling, deep low-level analysis) is only justified if it can change the decision or catch a real defect. If a deep-dive cannot flip the answer or expose a concrete risk, skip it — redundant inspection is cost, not rigor.
- Do not jump to assembly or IR inspection for ordinary non-hot-path code.
- Do not trade away clarity for hypothetical gains without evidence.
- Do not blame the compiler for a problem that is really data layout, allocation churn, or unnecessary work.
- Do not optimize around folklore when a profile can answer the question.
- Do not add abstraction or cleverness before the core behavior is correct and understandable.

## Reference Map

- `references/coding-workflow.md` for framing a coding task, shaping a change, and keeping the implementation simple.
- `references/correctness-and-clarity.md` for invariants, side effects, conversions, failure handling, and debugging posture.
- `references/foundations.md` for number formats, bits, floating-point, characters, and machine memory assumptions.
- `references/data-layout.md` for arrays, pointers, strings, records, objects, alignment, and storage tradeoffs.
- `references/execution-cost.md` for expression cost, control flow, loops, calls, stack behavior, and parameter passing.
- `references/compiler-reality.md` for compiler skepticism, codegen inspection, and when to validate emitted behavior.
- `references/review-checklists.md` for design, implementation, and performance review prompts.
- `references/engineering-systems.md` for data-intensive design, delivery flow, and infrastructure discipline.
- `references/user-supplied-links.md` for user-supplied research/project links relevant to future SSS updates, new skill creation, skill lifecycle evaluation, memory provenance, workspace-scoped agent systems, `prompt-sage` porting, long-context agent trace compilation, multimodal skill design, and interactive artifact feedback loops.
- `USAGE.md` for package-level usage and local evaluation commands.

## Book Synthesis (Best Elements)

- Write Great Code (Vol 1/2): reason from representation upward; data layout, memory traffic, and control flow are first-class design inputs.
- Clean Code + Pragmatic Programmer: use small, intention-revealing units; remove duplication carefully; keep error handling explicit; leave the code better than found.
- Fluent Python + Eloquent JavaScript: use language idioms that reduce accidental complexity; avoid clever metaprogramming when plain flow is clearer.
- Designing Data-Intensive Applications: design for correctness under scale and failure; state consistency model, durability needs, and data ownership boundaries.
- Continuous Delivery + Accelerate: keep changes small, testable, and reversible; optimize for fast feedback and deployment safety over heroics.
- Phoenix Project: treat bottlenecks and handoffs as system constraints; reduce WIP and interruption cost before adding more local optimization.
- Terraform Up & Running + Infrastructure as Code: version operational assumptions as code, avoid config drift, and require reproducible environments for reliable debugging.

## Mandatory Delivery Lens

1. Every non-trivial change states rollback path and blast radius.
2. Claims fail closed: a criterion is "not passing" until evidence (test, invariant, measured artifact) is opened and checked. Do not assert success you have not observed.
3. Every performance claim includes baseline and after metrics on representative load.
4. Every operational dependency (config, schema, infra) is explicit and versioned.
5. If change increases cognitive load, justify with measurable gain or simplify.
6. For high-stakes work, grade against a fresh-context check, not the same reasoning that built it — re-derive correctness from the spec/diff as if you never saw the implementation.
7. For skill, memory, or agent-workflow changes, prove downstream utility with pressure tests and check for negative transfer, stale memory, retrieval mismatch, and context pollution.

## Defaults

- Understand the task before changing the code.
- Correctness before optimization.
- Clarity before cleverness.
- Simplicity before cleverness.
- Debug from facts, not hunches.
- Evidence before micro-optimization.
- Generated behavior beats compiler mythology.
- Escalate only when it can change the answer.
- Track invariants that must not regress; re-check each iteration.
- Claims fail closed: not passing until evidence is opened.
- Grade high-stakes work from fresh context, not the reasoning that built it.
- Treat skill and memory changes as behavior changes: preserve provenance, test utility, and avoid global context pollution.
- Maximize signal density: project-specific facts over generic restatement; verbose context dilutes the point.

## Anti-Patterns

- Coding before the behavior, invariants, or failure modes are clear.
- Adding abstraction before the underlying flow is understood.
- Optimizing syntax without understanding representation.
- Micro-optimizing before locating the real bottleneck.
- Debugging from guesswork instead of observable facts.
- Assuming heap, string, or object abstractions are free.
- Treating floating-point or integer overflow behavior as obvious.
- Writing branchy or allocation-heavy code in hot loops without checking cost.
- Trusting that "the compiler will optimize it" when layout, aliasing, or call boundaries matter.
- Marking work "done" from the same context that built it, without re-checking against the spec from a clean view.
- Claiming a pass before opening the evidence that would prove it.

## Test Pack

Use `tests/test-academic.md` and `tests/test-pressure-*.md` to pressure-test whether this skill still pushes the right reasoning after edits, after adding new book material, or after adding skill/memory system guidance.
