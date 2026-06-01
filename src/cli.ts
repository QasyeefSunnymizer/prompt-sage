#!/usr/bin/env bun
import { render } from "ink"
import React from "react"
import { App } from "./tui/App.tsx"
import { resolveConfig } from "./config.ts"
import { OllamaProvider } from "./providers/ollama.ts"
import { ClaudeProvider } from "./providers/claude.ts"
import { CodexProvider } from "./providers/codex.ts"
import { doctor, probe } from "./diagnostics.ts"
import { compareText, parseLevels } from "./compare.ts"
import { listProjectSkills } from "./skills.ts"
import type { Provider } from "./providers/base.ts"
import type { PermissionGate } from "./agent/tools.ts"
import * as readline from "node:readline"

const cfg = resolveConfig()

function buildProvider(): Provider {
  switch (cfg.provider) {
    case "claude": return new ClaudeProvider(cfg.model)
    case "codex": return new CodexProvider(cfg.model)
    default: return new OllamaProvider(cfg.model, cfg.ollamaUrl)
  }
}

async function askPermission(toolName: string, _args: Record<string, unknown>): Promise<boolean> {
  if (cfg.allowShell && toolName === "execute_shell") return true
  if (cfg.autoApproveWrites && toolName === "write_file") return true
  if (toolName === "read_file" || toolName === "list_dir") return true

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  return new Promise(resolve => {
    rl.question(`\nAllow ${toolName}? [y/N] `, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase() === "y")
    })
  })
}

const gate: PermissionGate = askPermission

const [cmd, ...rest] = process.argv.slice(2)

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(`
prompt-sage v0.3.0 — coding agent

Usage:
  prompt-sage                        Start interactive agent
  prompt-sage "task description"     Start with initial task
  prompt-sage doctor                 Health check
  prompt-sage probe <command>        Check if command is available

Config (env vars):
  PROMPT_SAGE_PROVIDER=ollama|claude|codex
  PROMPT_SAGE_MODEL=llama3.2
  PROMPT_SAGE_OLLAMA_URL=http://localhost:11434
  PROMPT_SAGE_ALLOW_SHELL=1
  `.trim())
  process.exit(0)
}

if (cmd === "doctor" || cmd === "setup") {
  const items = doctor()
  for (const item of items) {
    const icon = item.status === "ok" ? "✓" : "✗"
    const color = item.status === "ok" ? "\x1b[32m" : "\x1b[31m"
    console.log(`${color}${icon}\x1b[0m ${item.name.padEnd(12)} ${item.detail}`)
    if (item.status !== "ok" && item.hint) console.log(`    hint: ${item.hint}`)
  }
  process.exit(items.some(i => i.status !== "ok") ? 1 : 0)
}

if (cmd === "probe") {
  const entry = probe(rest[0])
  const icon = entry.status === "ok" ? "✓" : "✗"
  console.log(`${icon} ${entry.name}: ${entry.detail}`)
  process.exit(entry.status === "ok" ? 0 : 1)
}

if (cmd === "compare") {
  const levelsFlag = rest.findIndex(a => a === "--levels")
  const levelsRaw = levelsFlag >= 0 ? rest[levelsFlag + 1] : null
  const levels = parseLevels(levelsRaw)
  const text = rest.filter((_, i) => levelsFlag < 0 || (i !== levelsFlag && i !== levelsFlag + 1)).join(" ")
  if (!text) {
    console.error("usage: prompt-sage compare [--levels lite,full,ultra] <text>")
    process.exit(1)
  }
  const rows = compareText(text, levels)
  for (const row of rows) {
    console.log(`${row.level.padEnd(10)} ${row.delta > 0 ? "+" : ""}${row.delta} chars  ${row.text.slice(0, 80)}`)
  }
  process.exit(0)
}

if (cmd === "skills") {
  const skills = listProjectSkills()
  if (!skills.length) {
    console.log("No skills found. Add skills/ directory with SKILL.md files.")
  } else {
    for (const s of skills) console.log(`${s.name.padEnd(20)} ${s.path}`)
  }
  process.exit(0)
}

// Default: start agent TUI
const provider = buildProvider()
const initialTask = (cmd !== "doctor" && cmd !== "probe" && cmd !== "setup") ? [cmd, ...rest].join(" ") : undefined

console.error(`\nprompt-sage — provider: ${cfg.provider} / model: ${cfg.model}\n`)

render(
  React.createElement(App, {
    provider,
    gate,
    ...(initialTask ? { initialTask } : {}),
  } as React.ComponentProps<typeof App>),
)
