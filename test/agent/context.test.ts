import { test, expect, describe } from "bun:test"
import { ContextManager } from "../../src/agent/context.ts"

describe("ContextManager", () => {
  test("starts with system prompt", () => {
    const ctx = new ContextManager()
    const h = ctx.getHistory()
    expect(h.length).toBe(1)
    expect(h[0].role).toBe("system")
  })

  test("appends messages", () => {
    const ctx = new ContextManager()
    ctx.append({ role: "user", content: "hello" })
    ctx.append({ role: "assistant", content: "hi" })
    expect(ctx.getHistory().length).toBe(3)
  })

  test("trims to maxMessages keeping system prompt", () => {
    const ctx = new ContextManager(4) // system + 3 messages max
    for (let i = 0; i < 10; i++) ctx.append({ role: "user", content: `msg ${i}` })
    const h = ctx.getHistory()
    expect(h.length).toBe(4)
    expect(h[0].role).toBe("system")
    expect(h[h.length - 1].content).toBe("msg 9")
  })

  test("clear resets to system prompt only", () => {
    const ctx = new ContextManager()
    ctx.append({ role: "user", content: "x" })
    ctx.clear()
    expect(ctx.getHistory().length).toBe(1)
    expect(ctx.getHistory()[0].role).toBe("system")
  })
})
