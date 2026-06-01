import { test, expect, describe } from "bun:test"
import { OllamaProvider } from "../../src/providers/ollama.ts"

// These tests require Ollama running at localhost:11434
// Skip them in CI with: PROMPT_SAGE_SKIP_OLLAMA=1 bun test
const skip = process.env.PROMPT_SAGE_SKIP_OLLAMA === "1"

describe("OllamaProvider", () => {
  test("constructs with defaults", () => {
    const p = new OllamaProvider("qwen3:8b-q8_0")
    expect(p.name).toBe("ollama")
    expect(p.model).toBe("qwen3:8b-q8_0")
  })

  test.skipIf(skip)("streams a text response from Ollama", async () => {
    const p = new OllamaProvider("qwen3:8b-q8_0")
    let got = ""
    for await (const d of p.stream([{ role: "user", content: "Say: hello" }], [])) {
      if (d.type === "text") got += d.text
      if (d.type === "done") break
    }
    expect(got.length).toBeGreaterThan(0)
  }, 60000)
})
