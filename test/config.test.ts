import { test, expect, describe } from "bun:test"
import { resolveConfig } from "../src/config.ts"

describe("resolveConfig", () => {
  test("returns defaults when nothing set", () => {
    const cfg = resolveConfig("/nonexistent-dir")
    expect(cfg.provider).toBe("ollama")
    expect(cfg.model).toBe("llama3.2")
    expect(cfg.sageMode).toBe("full")
    expect(cfg.ollamaUrl).toBe("http://localhost:11434")
    expect(cfg.allowShell).toBe(false)
    expect(cfg.autoApproveWrites).toBe(false)
  })

  test("env var PROMPT_SAGE_PROVIDER overrides default", () => {
    process.env.PROMPT_SAGE_PROVIDER = "claude"
    const cfg = resolveConfig("/nonexistent-dir")
    expect(cfg.provider).toBe("claude")
    delete process.env.PROMPT_SAGE_PROVIDER
  })

  test("env var PROMPT_SAGE_MODEL overrides default", () => {
    process.env.PROMPT_SAGE_MODEL = "mistral"
    const cfg = resolveConfig("/nonexistent-dir")
    expect(cfg.model).toBe("mistral")
    delete process.env.PROMPT_SAGE_MODEL
  })

  test("PROMPT_SAGE_ALLOW_SHELL=1 enables shell", () => {
    process.env.PROMPT_SAGE_ALLOW_SHELL = "1"
    const cfg = resolveConfig("/nonexistent-dir")
    expect(cfg.allowShell).toBe(true)
    delete process.env.PROMPT_SAGE_ALLOW_SHELL
  })
})
