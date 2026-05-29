# Live Benchmark Runner

## Purpose

Run phase-2 rubric against real model outputs (not static fixtures).

## Runner Contract

- Input on stdin: JSON with `id`, `mode`, `prompt`
- Output on stdout: answer text only

## OpenAI Runner

Use `scripts/openai_sss_runner.py` with `OPENAI_API_KEY` set.

### Example

```bash
export OPENAI_API_KEY=...
python3 scripts/run_sss_live_benchmark.py \
  --runner-cmd python3 scripts/openai_sss_runner.py --model gpt-5 \
  --label openai-gpt5
```

## Baseline vs SSS A/B

Run twice with different system behavior in your runner:

- Baseline prompt/policy (no SSS lens)
- SSS prompt/policy (with SSS lens)

Then compare `TOTAL criteria` and `TOTAL anti signals`.

## Local Fixture Check

Before running live model output, verify the static fixtures still match the rubric:

```powershell
python scripts/sss_eval.py benchmark
python scripts/sss_eval.py pressure
```
