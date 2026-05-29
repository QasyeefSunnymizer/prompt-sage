# Prompt Sage Merge Map

SSS is an incubator for Prompt Sage. Keep it independent until the behavior, tests, and source manifest are stable enough to import.

## Import Targets

- Skill behavior: import `skill/SKILL.md` and focused reference files into Prompt Sage's skill or policy layer.
- Evaluation: import `benchmarks/phase2-scenarios.json`, pressure tests, and `scripts/sss_eval.py` into Prompt Sage's evaluation suite.
- Source inventory: import `books/manifest.md` as provenance metadata, not as runtime context.
- Extraction notes: import distilled notes only when each note links to a test, benchmark, or active Prompt Sage behavior.

## Merge Default

Use a normal content import for the first Prompt Sage merge. Use `git subtree` only if preserving SSS history inside Prompt Sage becomes important. Do not use a submodule unless SSS remains a separately versioned dependency.

## Readiness Gate

Before merging, run:

```powershell
python scripts/sss_eval.py benchmark
python scripts/sss_eval.py pressure
```

Only merge guidance that improves or preserves the score and has a clear rollback path.
