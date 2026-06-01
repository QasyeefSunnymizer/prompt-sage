import type { Provider, ToolCallDelta } from "../providers/base.ts"
import type { ContextManager } from "./context.ts"
import { TOOL_DEFS, executeTool, type PermissionGate } from "./tools.ts"

export interface LoopCallbacks {
  onText(text: string): void
  onToolCall(name: string, args: Record<string, unknown>): void
  onToolResult(name: string, result: string): void
  onError(error: string): void
}

export async function runTurn(
  input: string,
  provider: Provider,
  context: ContextManager,
  gate: PermissionGate,
  callbacks: LoopCallbacks,
): Promise<void> {
  context.append({ role: "user", content: input })

  while (true) {
    const messages = context.getHistory()
    let accumulatedText = ""
    const pendingToolCalls: ToolCallDelta[] = []
    let stopReason: "end_turn" | "tool_use" | "error" = "end_turn"

    for await (const delta of provider.stream(messages, TOOL_DEFS)) {
      if (delta.type === "text") {
        accumulatedText += delta.text
        callbacks.onText(delta.text)
      } else if (delta.type === "tool_call") {
        pendingToolCalls.push(delta)
      } else if (delta.type === "done") {
        stopReason = delta.stop_reason
      }
    }

    if (accumulatedText) {
      context.append({ role: "assistant", content: accumulatedText })
    }

    if (stopReason !== "tool_use" || pendingToolCalls.length === 0) return

    for (const tc of pendingToolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.arguments) as Record<string, unknown>
      } catch {
        // ignore parse errors — pass empty args
      }

      callbacks.onToolCall(tc.name, args)
      const result = await executeTool(tc.name, args, gate)
      const output = result.error ? `Error: ${result.error}` : result.output
      callbacks.onToolResult(tc.name, output)

      context.append({ role: "tool", content: output, tool_call_id: tc.id })
    }
    // loop again with tool results appended
  }
}
