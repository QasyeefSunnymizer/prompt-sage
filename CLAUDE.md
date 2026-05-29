# NaN Forget - AI Long-Term Memory

## Rules

1. At session start, call `memory_sync` once when available. If MCP tools are unavailable, use `nan-forget sync`.
2. Search memory when prior project context may matter. Prefer `memory_search`; fallback: `nan-forget search "<topic>"`.
3. Save useful decisions, preferences, facts, and task context immediately. Prefer `memory_save`; fallback: `nan-forget add`.
4. Use checkpoints for completed work with problem, solution, files, concepts, and project.
5. If memory services are down, ask before starting them, then use `memory_start` or `nan-forget start`.

Project name: `prompt-sage`.
