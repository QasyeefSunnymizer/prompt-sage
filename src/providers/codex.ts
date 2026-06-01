import OpenAI from "openai"
import type { Provider, Message, ToolDef, Delta } from "./base.ts"
import { streamOpenAI } from "./openai-stream.ts"

export class CodexProvider implements Provider {
  readonly name = "codex"
  readonly model: string
  private client: OpenAI

  constructor(model = "gpt-4o") {
    this.model = model
    this.client = new OpenAI() // reads OPENAI_API_KEY from env
  }

  stream(messages: Message[], tools: ToolDef[]): AsyncIterable<Delta> {
    return streamOpenAI(this.client, this.model, messages, tools)
  }
}
