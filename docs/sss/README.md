# Sunny's Smart Synth In Prompt Sage

SSS is the engineering-judgment skill layer ported from the standalone `sunnys-smart-synth` playground.

## What Was Ported

- `skills/sunnys-smart-synth/SKILL.md`
- `skills/sunnys-smart-synth/references/`
- `skills/sunnys-smart-synth/tests/`
- `skills/sunnys-smart-synth/benchmarks/`
- `scripts/sss_eval.py`
- SSS merge, live-eval, and interaction docs under `docs/sss/`

## What Stayed In The Playground

- Candidate skills for security review, performance review, and prompt/agent review.
- Source acquisition queues and rough extraction notes.
- Future research material before promotion.

## Checks

From the Prompt Sage repo root:

```powershell
python scripts/sss_eval.py benchmark
python scripts/sss_eval.py pressure
```

These checks validate the ported core SSS fixtures. Candidate-skill checks stay in the standalone SSS playground until each candidate is promoted.
