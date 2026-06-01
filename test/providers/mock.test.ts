import { test, expect } from "bun:test"
import { MockProvider, textTurn, toolTurn } from "../../src/providers/mock.ts"

test("MockProvider yields canned text turn", async () => {
  const provider = new MockProvider([textTurn("hello")])
  const deltas: string[] = []
  for await (const d of provider.stream([], [])) {
    if (d.type === "text") deltas.push(d.text)
  }
  expect(deltas).toEqual(["hello"])
})

test("MockProvider yields canned tool call", async () => {
  const provider = new MockProvider([toolTurn("call-1", "read_file", { path: "foo.ts" })])
  const calls: string[] = []
  for await (const d of provider.stream([], [])) {
    if (d.type === "tool_call") calls.push(d.name)
  }
  expect(calls).toEqual(["read_file"])
})
