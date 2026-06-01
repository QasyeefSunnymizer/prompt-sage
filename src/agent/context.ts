import type { Message } from "../providers/base.ts"

const SYSTEM_PROMPT = `You are prompt-sage, a focused coding agent. Help users write, read, debug, and modify code.

Rules:
- Always read a file before editing it.
- Prefer targeted edits over full rewrites.
- Run tests after changes when a test command is available.
- If a command fails twice with the same error, stop and explain before retrying.
- Be concise. Token efficiency matters.`

export class ContextManager {
  private history: Message[]
  private maxMessages: number

  constructor(maxMessages = 40) {
    this.maxMessages = maxMessages
    this.history = [{ role: "system", content: SYSTEM_PROMPT }]
  }

  append(message: Message): void {
    this.history.push(message)
    this.trim()
  }

  getHistory(): Message[] {
    return [...this.history]
  }

  clear(): void {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }]
  }

  private trim(): void {
    const system = this.history.filter(m => m.role === "system")
    const rest = this.history.filter(m => m.role !== "system")
    const limit = this.maxMessages - system.length
    if (rest.length > limit) {
      this.history = [...system, ...rest.slice(rest.length - limit)]
    }
  }
}
