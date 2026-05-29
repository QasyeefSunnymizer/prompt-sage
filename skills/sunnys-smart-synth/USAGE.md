# Sunny's Smart Synth Usage

Use `SKILL.md` as the entry point. Load reference files only when the task needs that lens:

- `references/coding-workflow.md` for implementation framing.
- `references/correctness-and-clarity.md` for invariants, side effects, and failure behavior.
- `references/data-layout.md`, `execution-cost.md`, and `compiler-reality.md` when representation, memory traffic, or generated behavior can change the answer.
- `references/engineering-systems.md` when delivery, memory, skill, or operations behavior matters.

## Evaluation

From the repository root:

```powershell
python scripts/sss_eval.py benchmark
python scripts/sss_eval.py pressure
```

Passing means the current SSS answer fixtures hit all expected signals and avoid all anti-signals. A pass is evidence for the fixture only; live model outputs still need separate evaluation.
