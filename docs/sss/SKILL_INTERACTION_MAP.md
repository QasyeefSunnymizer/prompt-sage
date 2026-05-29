# SSS Skill Interaction Map

Use SSS core as the default engineering judgment lens. Candidate skills named here are still incubating in the standalone `sunnys-smart-synth` playground and should be imported only after promotion.

## Routing

| Situation | Use |
| --- | --- |
| Ordinary implementation, refactor, debugging, or review | SSS core |
| Auth, secrets, user data, dependencies, public-source intel, abuse paths, or privacy/legal exposure | SSS core now; import `security-review` after promotion |
| Latency, throughput, memory traffic, allocation, model routing, token budgets, benchmark claims, or cost | SSS core now; import `performance-review` after promotion |
| Prompts, agents, tools, memory, evals, routing, approvals, or workflow realism | SSS core now; import `prompt-agent-review` after promotion |
| Security-sensitive agent or prompt work | SSS core now; later combine `security-review` + `prompt-agent-review` |
| Agent cost/performance or model-routing work | SSS core now; later combine `performance-review` + `prompt-agent-review` |

## Overlap Rules

- Do not trigger every skill by default; each extra lens must change the review output.
- If two skills conflict, preserve correctness and safety first, then optimize latency/cost.
- Security findings need exploit path and mitigation; performance findings need baseline/after evidence; prompt-agent findings need workflow trace or eval evidence.
- For Prompt Sage, promote candidates only after `candidate-audit`, `candidate-benchmark`, and `candidate-pressure` pass.
