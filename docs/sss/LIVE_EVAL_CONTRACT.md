# Live Evaluation Contract

Use this contract when testing real model outputs against the ported SSS core skill. Candidate skill live evals stay in the standalone `sunnys-smart-synth` playground until those skills are promoted.

## Input

Each runner receives one JSON object on stdin:

```json
{
  "id": "scenario-id",
  "mode": "Refactor",
  "prompt": "Scenario prompt text",
  "skill": "sunnys-smart-synth"
}
```

## Output

The runner writes answer text only to stdout. Save collected outputs as:

```json
{
  "scenario-id": {
    "response": "model answer text"
  }
}
```

## Scoring

Use deterministic fixture scoring first:

```powershell
python scripts/sss_eval.py benchmark
python scripts/sss_eval.py pressure
```

For live model output, pass the captured answer file to the relevant benchmark command:

```powershell
python scripts/sss_eval.py benchmark --answers path/to/live-answers.json
```

## Acceptance

- A live run passes only when expected signals pass and anti-signals are zero.
- Regression means either the skill prompt changed, the runner changed, or the model behavior changed; inspect traces before changing the rubric.
- Keep live outputs out of source control if they contain private code, secrets, customer data, or sensitive prompts.
