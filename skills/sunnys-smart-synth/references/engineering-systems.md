# Engineering Systems

Use this file when code decisions interact with delivery, data systems, and operations.

## Per-Book Distillate

### Write Great Code (Vol 1/2)

- Think from machine model to source model: representation, layout, and flow dictate real cost.
- Prefer contiguous data and predictable branches in hot paths.
- Treat "simple code" as code with explainable generated behavior.

### Clean Code

- Small functions, clear names, single intention per unit.
- Eliminate duplication that causes divergent behavior.
- Keep error paths explicit and close to the failing operation.

### The Pragmatic Programmer

- Make assumptions visible in code, tests, and docs.
- Build tracer bullets: thin end-to-end slices before scaling solution scope.
- Automate repetitive quality work (tests, lint, static checks, build).

### Fluent Python

- Use native data structures and protocols first.
- Prefer composition and explicit APIs over magical inheritance chains.
- Avoid hidden mutation and accidental aliasing in containers.

### Eloquent JavaScript

- Model state transitions explicitly; avoid callback/control-flow tangles.
- Keep module boundaries clean; isolate side effects.
- Favor plain data transformations over framework-dependent tricks.

### Designing Data-Intensive Applications

- Define system of record and consistency requirement per flow.
- Be explicit about trade-offs: latency, durability, consistency, operability.
- Prefer idempotent handlers, immutable event records, and replay-safe logic.

### Continuous Delivery

- Keep deploy units small and reversible.
- Build quality in: fast tests, deterministic builds, environment parity.
- Decouple release from deploy where possible.

### Accelerate

- Optimize lead time, deployment frequency, MTTR, and change failure rate.
- Reduce batch size; shorten feedback loops.
- Reliability work is feature work when user impact is high.

### The Phoenix Project

- Identify constraint and subordinate local optimizations to it.
- Limit work-in-progress; finish before starting new tasks.
- Improve flow between dev, ops, QA, and product, not only local code quality.

### Terraform: Up & Running

- Version infrastructure, use remote state and locking, avoid manual drift.
- Use modules to encode proven patterns; avoid copy-paste infrastructure.
- Treat secrets and state handling as first-class security concerns.

### Infrastructure as Code (Morris)

- Design infrastructure as evolving products, not static scripts.
- Prefer immutable replacement patterns to ad-hoc mutable repair.
- Test infra changes with staged promotion and policy guardrails.

### Agent Skill And Memory Systems

- Evaluate skills by downstream task utility, not by apparent completeness or polish.
- Watch for negative transfer: a reusable procedure that helps one domain, model, or target agent can harm another.
- Keep memory generation, extraction, storage, retrieval, and use traceable enough to debug where a bad answer entered the system.
- Project-scoped files, memory, and skills reduce context pollution and make rollback practical.
- Routing cheaper models to simpler work is only valid when quality gates catch demotion failures.

## SSS System Rules

1. State invariant, blast radius, rollback path before non-trivial edits.
2. Require measurable acceptance criteria for performance and reliability changes.
3. Keep design docs and code aligned on data ownership and failure behavior.
4. If operational toil rises, refactor interface or automation before adding features.
5. If local optimization hurts global flow, optimize the constraint instead.
6. For agent systems, preserve provenance for memory and skill updates, then validate that retrieval or reuse improves the real task instead of only adding context.

## Ready-to-Use Prompts

- "What is the real bottleneck: CPU, memory traffic, I/O, coordination, or queueing?"
- "Which invariant can fail first, and how do we detect it fast?"
- "If this deploy fails, how do we roll back safely within minutes?"
- "Does this abstraction reduce cognitive load, or only hide complexity?"
- "Can this path be replayed/idempotent under retries and partial failures?"
- "Which memory or skill entry influenced this answer, and can we remove or repair it if it is wrong?"
- "Did this skill improve the target task, or did it introduce negative transfer?"
