import type { Provider, Message, ToolDef, Delta } from "./base.ts"

export class MockProvider implements Provider {
  readonly name = "mock"
  readonly model = "mock-model"
  private responses: Delta[][]

  constructor(responses: Delta[][] = []) {
    this.responses = [...responses]
  }

  async *stream(_messages: Message[], _tools: ToolDef[]): AsyncIterable<Delta> {
    const next = this.responses.shift()
    if (!next) {
      yield { type: "text", text: "mock response" }
      yield { type: "done", stop_reason: "end_turn" }
      return
    }
    for (const delta of next) yield delta
  }
}

export function textTurn(text: string): Delta[] {
  return [
    { type: "text", text },
    { type: "done", stop_reason: "end_turn" },
  ]
}

export function toolTurn(id: string, name: string, args: Record<string, unknown>): Delta[] {
  return [
    { type: "tool_call", id, name, arguments: JSON.stringify(args) },
    { type: "done", stop_reason: "tool_use" },
  ]
}
