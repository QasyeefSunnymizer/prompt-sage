import { test, expect, describe } from "bun:test"
import { runTurn } from "../../src/agent/loop.ts"
import { MockProvider, textTurn, toolTurn } from "../../src/providers/mock.ts"
import { ContextManager } from "../../src/agent/context.ts"
import type { LoopCallbacks } from "../../src/agent/loop.ts"

const ALLOW = async () => true

function makeCallbacks(): { callbacks: LoopCallbacks; texts: string[]; toolCalls: string[] } {
  const texts: string[] = []
  const toolCalls: string[] = []
  const callbacks: LoopCallbacks = {
    onText: t => texts.push(t),
    onToolCall: (name) => toolCalls.push(name),
    onToolResult: () => {},
    onError: () => {},
  }
  return { callbacks, texts, toolCalls }
}

describe("runTurn", () => {
  test("streams text response", async () => {
    const provider = new MockProvider([textTurn("hello world")])
    const ctx = new ContextManager()
    const { callbacks, texts } = makeCallbacks()
    await runTurn("hi", provider, ctx, ALLOW, callbacks)
    expect(texts.join("")).toBe("hello world")
  })

  test("appends user + assistant to history", async () => {
    const provider = new MockProvider([textTurn("ok")])
    const ctx = new ContextManager()
    const { callbacks } = makeCallbacks()
    await runTurn("test input", provider, ctx, ALLOW, callbacks)
    const h = ctx.getHistory()
    const user = h.find(m => m.content === "test input")
    const asst = h.find(m => m.content === "ok")
    expect(user).toBeTruthy()
    expect(asst).toBeTruthy()
  })

  test("executes tool call and loops with result", async () => {
    // Turn 1: model requests read_file
    // Turn 2: model returns text after seeing tool result
    const provider = new MockProvider([
      toolTurn("tc-1", "read_file", { path: "nonexistent-for-test.txt" }),
      textTurn("done"),
    ])
    const ctx = new ContextManager()
    const { callbacks, toolCalls, texts } = makeCallbacks()
    await runTurn("read a file", provider, ctx, ALLOW, callbacks)
    expect(toolCalls).toContain("read_file")
    expect(texts.join("")).toBe("done")
  })

  test("denied tool call appends error and continues", async () => {
    const DENY = async () => false
    const provider = new MockProvider([
      toolTurn("tc-1", "execute_shell", { command: "rm -rf /" }),
      textTurn("ok I won't"),
    ])
    const ctx = new ContextManager()
    const { callbacks, texts } = makeCallbacks()
    await runTurn("do something destructive", provider, ctx, DENY, callbacks)
    expect(texts.join("")).toBe("ok I won't")
  })
})
