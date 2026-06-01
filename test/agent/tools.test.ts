import { test, expect, describe } from "bun:test"
import { executeTool, TOOL_DEFS } from "../../src/agent/tools.ts"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import type { PermissionGate } from "../../src/agent/tools.ts"

const ALLOW: PermissionGate = async () => true
const DENY: PermissionGate = async () => false

const tmpDir = join(tmpdir(), `ps-tools-test-${Date.now()}`)
mkdirSync(tmpDir, { recursive: true })
writeFileSync(join(tmpDir, "hello.txt"), "hello world")

describe("TOOL_DEFS", () => {
  test("exports 4 tools", () => {
    expect(TOOL_DEFS.length).toBe(4)
    const names = TOOL_DEFS.map(t => t.name)
    expect(names).toContain("read_file")
    expect(names).toContain("write_file")
    expect(names).toContain("list_dir")
    expect(names).toContain("execute_shell")
  })
})

describe("executeTool", () => {
  test("read_file returns file contents", async () => {
    const r = await executeTool("read_file", { path: "hello.txt" }, ALLOW, tmpDir)
    expect(r.output).toBe("hello world")
    expect(r.error).toBeUndefined()
  })

  test("read_file missing file returns error", async () => {
    const r = await executeTool("read_file", { path: "nope.txt" }, ALLOW, tmpDir)
    expect(r.error).toContain("not found")
  })

  test("write_file creates file", async () => {
    const r = await executeTool("write_file", { path: "out.txt", content: "written" }, ALLOW, tmpDir)
    expect(r.error).toBeUndefined()
    const verify = await executeTool("read_file", { path: "out.txt" }, ALLOW, tmpDir)
    expect(verify.output).toBe("written")
  })

  test("list_dir lists files", async () => {
    const r = await executeTool("list_dir", { path: "." }, ALLOW, tmpDir)
    expect(r.output).toContain("hello.txt")
  })

  test("denied call returns user denied error", async () => {
    const r = await executeTool("write_file", { path: "x.txt", content: "x" }, DENY, tmpDir)
    expect(r.error).toBe("user denied")
  })

  test("execute_shell runs command", async () => {
    const r = await executeTool("execute_shell", { command: "echo ps-test-ok" }, ALLOW, tmpDir)
    expect(r.output).toContain("ps-test-ok")
  })

  test("unknown tool returns error", async () => {
    const r = await executeTool("nonexistent", {}, ALLOW, tmpDir)
    expect(r.error).toContain("unknown tool")
  })
})
