import { LEVELS, transformText } from "./style-engine.js"

export type ParseResult =
  | { type: "start"; active: true; level: string }
  | { type: "stop"; active: false; level: string }
  | { type: "none"; active: boolean; level: string }
  | { type: "error"; error: string }

export type RespondResult = { modeApplied: string; text: string }

export class SageMode {
  active = false
  level = "full"

  parseCommand(input: string): ParseResult {
    const raw = (input ?? "").trim().toLowerCase()
    if (raw === "stop sage" || raw === "normal mode") {
      this.active = false
      return { type: "stop", active: false, level: this.level }
    }
    if (!raw.startsWith("/sage")) {
      return { type: "none", active: this.active, level: this.level }
    }
    const [, arg] = raw.split(/\s+/, 2)
    if (arg && LEVELS.has(arg)) {
      this.level = arg
    } else if (arg) {
      return { type: "error", error: `Unknown level '${arg}'. Use lite|full|ultra|master|roleplay.` }
    }
    this.active = true
    return { type: "start", active: true, level: this.level }
  }

  respond(text: string): RespondResult {
    if (!this.active) return { modeApplied: "off", text }
    return transformText(text, this.level)
  }
}
