import type OpenAI from "openai"
import type { Message, ToolDef, Delta } from "./base.ts"

export async function* streamOpenAI(
  client: OpenAI,
  model: string,
  messages: Message[],
  tools: ToolDef[],
): AsyncIterable<Delta> {
  const mapped = messages.map(m => ({
    role: m.role as "user" | "assistant" | "system" | "tool",
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
  }))

  const toolParams =
    tools.length > 0
      ? tools.map(t => ({
          type: "function" as const,
          function: { name: t.name, description: t.description, parameters: t.parameters },
        }))
      : undefined

  const stream = await client.chat.completions.create({
    model,
    messages: mapped as OpenAI.ChatCompletionMessageParam[],
    ...(toolParams ? { tools: toolParams } : {}),
    stream: true,
  })

  const pending: Record<number, { id: string; name: string; arguments: string }> = {}

  for await (const chunk of stream) {
    const choice = chunk.choices[0]
    if (!choice) continue
    const delta = choice.delta

    if (delta.content) yield { type: "text", text: delta.content }

    for (const tc of delta.tool_calls ?? []) {
      if (!pending[tc.index]) pending[tc.index] = { id: "", name: "", arguments: "" }
      if (tc.id) pending[tc.index].id = tc.id
      if (tc.function?.name) pending[tc.index].name = tc.function.name
      pending[tc.index].arguments += tc.function?.arguments ?? ""
    }

    if (choice.finish_reason === "tool_calls") {
      for (const tc of Object.values(pending)) {
        yield { type: "tool_call", id: tc.id, name: tc.name, arguments: tc.arguments }
      }
      yield { type: "done", stop_reason: "tool_use" }
      return
    }

    if (choice.finish_reason === "stop") {
      yield { type: "done", stop_reason: "end_turn" }
      return
    }
  }

  yield { type: "done", stop_reason: "end_turn" }
}
