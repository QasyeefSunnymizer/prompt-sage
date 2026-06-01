import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

export type SageModeLevel = "lite" | "full" | "ultra" | "master" | "off"
export type ProviderName = "ollama" | "claude" | "codex"

export interface Config {
  provider: ProviderName
  model: string
  sageMode: SageModeLevel
  ollamaUrl: string
  allowShell: boolean
  autoApproveWrites: boolean
}

const DEFAULTS: Config = {
  provider: "ollama",
  model: "llama3.2",
  sageMode: "full",
  ollamaUrl: "http://localhost:11434",
  allowShell: false,
  autoApproveWrites: false,
}

function readJsonFile(path: string): Partial<Config> {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<Config>
  } catch {
    return {}
  }
}

export function resolveConfig(cwd = process.cwd()): Config {
  const userConfig = readJsonFile(join(homedir(), ".prompt-sage", "config.json"))
  const projectConfig = readJsonFile(join(cwd, ".prompt-sage", "config.json"))
  const envOverrides: Partial<Config> = {}
  if (process.env.PROMPT_SAGE_PROVIDER) envOverrides.provider = process.env.PROMPT_SAGE_PROVIDER as ProviderName
  if (process.env.PROMPT_SAGE_MODEL) envOverrides.model = process.env.PROMPT_SAGE_MODEL
  if (process.env.PROMPT_SAGE_OLLAMA_URL) envOverrides.ollamaUrl = process.env.PROMPT_SAGE_OLLAMA_URL
  if (process.env.PROMPT_SAGE_ALLOW_SHELL === "1") envOverrides.allowShell = true
  return { ...DEFAULTS, ...userConfig, ...projectConfig, ...envOverrides }
}
