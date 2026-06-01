import { test, expect } from "bun:test"
import { OllamaProvider } from "../../src/providers/ollama.ts"
import { ContextManager } from "../../src/agent/context.ts"
import { runTurn } from "../../src/agent/loop.ts"
import type { LoopCallbacks } from "../../src/agent/loop.ts"

const skip = process.env.PROMPT_SAGE_SKIP_OLLAMA === "1"

test.skipIf(skip)("full agent loop: list src/ directory", async () => {
  const provider = new OllamaProvider("qwen3:8b-q8_0")
  const ctx = new ContextManager()
  const texts: string[] = []
  const toolCalls: string[] = []

  const callbacks: LoopCallbacks = {
    onText: t => texts.push(t),
    onToolCall: (name, _args) => toolCalls.push(name),
    onToolResult: () => {},
    onError: () => {},
  }

  await runTurn(
    "Use the list_dir tool to list the files in the current directory, then tell me what you see.",
    provider,
    ctx,
    async () => true, // allow all tools
    callbacks
  )

  // Agent should have called list_dir and produced some output
  const fullText = texts.join("")
  expect(fullText.length).toBeGreaterThan(0)
  console.log("Agent response:", fullText.slice(0, 200))
}, 60000) // 60s timeout for model response
