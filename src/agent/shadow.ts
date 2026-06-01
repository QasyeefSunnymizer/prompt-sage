import { createRequire } from "node:module"
const _require = createRequire(import.meta.url)
const { ShadowMindAnalyzer: _ShadowMindAnalyzer } = _require("../sidecar/analyzer.js")

export interface ShadowInsight {
  level: "critical" | "warning" | "info"
  title: string
  body: string
}

export interface ShadowSnapshot {
  trajectory: string
  insight: ShadowInsight | null
  optimizedPrompt: string
  notes: string
  border: "critical" | "warning" | "normal"
  savingsPct: number
}

// Re-export the analyzer
export const ShadowMindAnalyzer = _ShadowMindAnalyzer as new (options?: { maxEvents?: number; loopThreshold?: number }) => {
  observe(source: string, text: string): Omit<ShadowSnapshot, "savingsPct">
  snapshot(): Omit<ShadowSnapshot, "savingsPct">
}
