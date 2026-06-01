import { existsSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

function repoRoot(): string {
  return join(__dirname, "..")
}

function exeSuffix(platform = process.platform): string {
  return platform === "win32" ? ".exe" : ""
}

export function candidateRustBins(env = process.env, platform = process.platform): string[] {
  const exe = exeSuffix(platform)
  return [
    env.PROMPT_SAGE_BIN,
    join(repoRoot(), "rust", "prompt-sage-rs", "target", "release", `prompt-sage${exe}`),
    join(repoRoot(), "rust", "prompt-sage-rs", "target", "debug", `prompt-sage${exe}`),
    join(repoRoot(), "bin", `prompt-sage${exe}`),
  ].filter(Boolean) as string[]
}

export function candidateTuiBins(env = process.env, platform = process.platform): string[] {
  const exe = exeSuffix(platform)
  return [
    env.PROMPT_SAGE_TUI_BIN,
    join(repoRoot(), "tui", "target", "release", `prompt-sage-tui${exe}`),
    join(repoRoot(), "tui", "target", "debug", `prompt-sage-tui${exe}`),
    join(repoRoot(), "bin", `prompt-sage-tui${exe}`),
  ].filter(Boolean) as string[]
}

function commandProbe(
  command: string,
  env = process.env,
  platform = process.platform,
): { ok: boolean; detail: string } {
  const key = `PROMPT_SAGE_PROBE_${command.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
  const forced = env[key]
  if (forced === "missing") return { ok: false, detail: "forced missing" }
  if (forced === "ok") return { ok: true, detail: "forced available" }

  const result =
    platform === "win32"
      ? spawnSync("where.exe", [command], { encoding: "utf8", shell: false })
      : spawnSync("sh", ["-lc", `command -v '${String(command).replace(/'/g, "'\\''")}'`], { encoding: "utf8" })

  if (result.status === 0) {
    return { ok: true, detail: (result.stdout || "").split(/\r?\n/).find(Boolean) || "available" }
  }
  return { ok: false, detail: "not found on PATH" }
}

function checkPackage(name: string): boolean {
  return existsSync(join(repoRoot(), "node_modules", name))
}

export type DiagItem = {
  name: string
  status: "ok" | "missing"
  detail: string
  hint: string
}

export function probe(command: string): DiagItem {
  const result = commandProbe(command)
  return {
    name: command,
    status: result.ok ? "ok" : "missing",
    detail: result.detail,
    hint: result.ok ? "" : `Install ${command} and ensure it is on your PATH`,
  }
}

export function doctor(): DiagItem[] {
  const items: DiagItem[] = []

  // Check bun
  const bunProbe = commandProbe("bun")
  items.push({
    name: "bun",
    status: bunProbe.ok ? "ok" : "missing",
    detail: bunProbe.detail,
    hint: "Install Bun from https://bun.sh",
  })

  // Check node (fallback runtime)
  const nodeProbe = commandProbe("node")
  items.push({
    name: "node",
    status: nodeProbe.ok ? "ok" : "missing",
    detail: nodeProbe.detail,
    hint: "Install Node.js from https://nodejs.org",
  })

  // Check ollama
  const ollamaProbe = commandProbe("ollama")
  items.push({
    name: "ollama",
    status: ollamaProbe.ok ? "ok" : "missing",
    detail: ollamaProbe.detail,
    hint: "Install Ollama from https://ollama.ai",
  })

  // Check git
  const gitProbe = commandProbe("git")
  items.push({
    name: "git",
    status: gitProbe.ok ? "ok" : "missing",
    detail: gitProbe.detail,
    hint: "Install Git from https://git-scm.com",
  })

  // Check ink dependency
  const hasInk = checkPackage("ink")
  items.push({
    name: "ink",
    status: hasInk ? "ok" : "missing",
    detail: hasInk ? "installed" : "not installed",
    hint: "Run: bun install",
  })

  // Check @anthropic-ai/sdk
  const hasSdk = checkPackage("@anthropic-ai/sdk")
  items.push({
    name: "anthropic-sdk",
    status: hasSdk ? "ok" : "missing",
    detail: hasSdk ? "installed" : "not installed",
    hint: "Run: bun install",
  })

  // Check for TUI binary
  const tuiBins = candidateTuiBins()
  const foundTui = tuiBins.find(b => existsSync(b))
  items.push({
    name: "tui-bin",
    status: foundTui ? "ok" : "missing",
    detail: foundTui ? foundTui : "no binary found",
    hint: "Run: cd tui && cargo build --release",
  })

  return items
}
