import { test, expect, describe } from "bun:test"
import { SageMode } from "../src/sage-mode.ts"

describe("SageMode", () => {
  test("starts inactive", () => {
    const m = new SageMode()
    expect(m.active).toBe(false)
    expect(m.level).toBe("full")
  })

  test("parseCommand /sage activates", () => {
    const m = new SageMode()
    const r = m.parseCommand("/sage")
    expect(r.type).toBe("start")
    expect(m.active).toBe(true)
  })

  test("parseCommand /sage lite sets level", () => {
    const m = new SageMode()
    m.parseCommand("/sage lite")
    expect(m.level).toBe("lite")
  })

  test("parseCommand stop sage deactivates", () => {
    const m = new SageMode()
    m.parseCommand("/sage")
    m.parseCommand("stop sage")
    expect(m.active).toBe(false)
  })

  test("parseCommand unknown level returns error", () => {
    const m = new SageMode()
    const r = m.parseCommand("/sage bogus")
    expect(r.type).toBe("error")
  })

  test("respond when inactive returns text unchanged", () => {
    const m = new SageMode()
    const r = m.respond("hello world")
    expect(r.modeApplied).toBe("off")
    expect(r.text).toBe("hello world")
  })
})
