# NaN Forget - AI Long-Term Memory

## Rules

1. At session start, run `nan-forget sync` once if MCP memory tools are unavailable.
2. Search before relying on past context: `nan-forget search "<topic>"`.
3. Save durable decisions, preferences, facts, task context, and completed work:
   `nan-forget add --type <fact|decision|preference|task|context> --project "prompt-sage" "<content>"`.
4. After completed work, save a checkpoint when useful:
   `nan-forget checkpoint --summary "..." --problem "..." --solution "..." --files f1,f2 --concepts c1,c2 --project "prompt-sage"`.
5. If services are down, run `nan-forget start` or start Ollama, then retry.

Use structured fields where possible so future searches recover full problem and solution context.
