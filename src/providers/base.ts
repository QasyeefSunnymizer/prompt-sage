export interface Message {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  tool_call_id?: string
}

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface TextDelta {
  type: "text"
  text: string
}

export interface ToolCallDelta {
  type: "tool_call"
  id: string
  name: string
  arguments: string
}

export interface DoneDelta {
  type: "done"
  stop_reason: "end_turn" | "tool_use" | "error"
}

export type Delta = TextDelta | ToolCallDelta | DoneDelta

export interface Provider {
  readonly name: string
  readonly model: string
  stream(messages: Message[], tools: ToolDef[]): AsyncIterable<Delta>
}
