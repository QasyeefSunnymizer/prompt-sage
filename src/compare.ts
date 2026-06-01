import { LEVELS, transformText } from "./style-engine.ts"

export interface CompareRow {
  level: string
  modeApplied: string
  chars: number
  delta: number
  text: string
}

export function parseLevels(raw: string | null | undefined): string[] {
  const selected = (raw ?? "lite,full,ultra")
    .split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean)
  const invalid = selected.filter(level => !LEVELS.has(level))
  if (invalid.length) {
    throw new Error(`Unknown level '${invalid[0]}'. Use ${Array.from(LEVELS).join("|")}.`)
  }
  return selected
}

export function compareText(input: string, levels: string[] = ["lite", "full", "ultra"]): CompareRow[] {
  return levels.map(level => {
    const out = transformText(input, level)
    return {
      level,
      modeApplied: out.modeApplied,
      chars: out.text.length,
      delta: out.text.length - input.length,
      text: out.text,
    }
  })
}
