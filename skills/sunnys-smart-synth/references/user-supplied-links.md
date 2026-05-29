# User-Supplied Links for Future SSS Updates

These links were supplied by the user as material to preserve for future SSS updates, possible new skill creation, and later porting work into `prompt-sage`.

## Research Papers

- https://huggingface.co/papers/2605.25343
  - `Toward Native Multimodal Modeling: A Roadmap`
  - Useful for SSS when reasoning about multimodal skill design, unified input/output taxonomies, architecture/deployment/evaluation lifecycle, and modality-specific tradeoffs.
- https://huggingface.co/papers/2605.26895
  - `Negligible in Size, Significant in Effect: On Scale Vectors in Large Language Models`
  - Useful for SSS when discussing small architectural choices with outsized optimization impact, normalization scale vectors, weight decay placement, and cheap training improvements.
- https://huggingface.co/papers/2605.21850
  - `ACC: Compiling Agent Trajectories for Long-Context Training`
  - Useful for SSS and `prompt-sage` when turning agent traces, tool outputs, and scattered observations into compact long-context QA/training/evaluation artifacts.
- https://huggingface.co/papers/2605.22791
  - `Gated DeltaNet-2: Decoupling Erase and Write in Linear Attention`
  - Useful for SSS when reasoning about long-context memory design, recurrent state updates, erase/write separation, retrieval behavior, and constant-memory sequence processing.
- https://huggingface.co/papers/2605.23899
  - `From Raw Experience to Skill Consumption: A Systematic Study of Model-Generated Agent Skills`
  - Primary SSS reference for skill lifecycle work: experience generation, skill extraction, skill consumption, negative transfer, extractor/consumer mismatch, and meta-skill guidance.
  - Useful when updating SSS itself: skill quality should be judged by downstream utility under realistic task pressure, not by whether the written skill sounds comprehensive.
- https://huggingface.co/papers/2605.28732
  - `MemTrace: Tracing and Attributing Errors in Large Language Model Memory Systems`
  - Primary SSS reference for memory debugging, provenance, and fault attribution in long-horizon agent systems.
  - Useful for adding checks around memory evolution, information loss, retrieval misalignment, stale summaries, corrupted context, and closed-loop correction from trace evidence.

## Projects

- https://github.com/paraschopra/make-pages-interactive
  - A Claude Code skill that injects a lightweight feedback layer into static HTML pages, accepts local comments, and lets an agent revise pages from a JSONL inbox.
  - Useful pattern for SSS/prompt-sage artifact review: human highlights/clicks page content, leaves notes, agent reads structured feedback, edits artifact, and records history.
- https://github.com/OpenBMB/PilotDeck
  - `PilotDeck`: task-oriented AI agent productivity platform organized around WorkSpace-level isolation, white-box memory, smart routing, and always-on background execution.
  - Useful for SSS as agent-systems inspiration: project-scoped files, memory, and skills reduce context pollution; traceable editable memory supports factual debugging; routing policy should balance task difficulty, cost, and quality evidence.
  - Treat as a systems reference rather than a core low-level programming reference.

## Usage Notes

- Revisit these links when updating SSS behavior, references, benchmarks, or extraction guidance.
- If creating a new skill from SSS or porting SSS ideas into `prompt-sage`, evaluate whether these resources should become primary references, examples, or benchmark prompts.
- For new skill or memory material, add pressure tests that check downstream utility, negative transfer, provenance, and failure attribution.
- Keep this file as a durable repo-local backup in case chat memory does not retain every link.
