import Anthropic from "@anthropic-ai/sdk"
import type { Provider, Message, ToolDef, Delta } from "./base.ts"

export class ClaudeProvider implements Provider {
  readonly name = "claude"
  readonly model: string
  private client: Anthropic

  constructor(model = "claude-sonnet-4-6") {
    this.model = model
    this.client = new Anthropic()
  }

  async *stream(messages: Message[], tools: ToolDef[]): AsyncIterable<Delta> {
    const systemMsg = messages.find(m => m.role === "system")
    const rest = messages.filter(m => m.role !== "system")

    const anthropicMessages = rest.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool["input_schema"],
    }))

    const streamParams: Anthropic.MessageStreamParams = {
      model: this.model,
      max_tokens: 8096,
      messages: anthropicMessages,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
    }

    const stream = this.client.messages.stream(streamParams)

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text }
      }
    }

    const finalMsg = await stream.finalMessage()

    for (const block of finalMsg.content) {
      if (block.type === "tool_use") {
        yield {
          type: "tool_call",
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        }
      }
    }

    yield {
      type: "done",
      stop_reason: finalMsg.stop_reason === "tool_use" ? "tool_use" : "end_turn",
    }
  }
}
