import React from "react"
import { Box, Text } from "ink"
import type { ShadowSnapshot } from "../agent/shadow.ts"

interface Props {
  snapshot: ShadowSnapshot
  width: number
}

function meter(pct: number, width: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, pct / 100)) * width)
  return "=".repeat(filled) + "-".repeat(width - filled)
}

export function SidePanel({ snapshot, width }: Props) {
  const borderColor =
    snapshot.border === "critical" ? "red" : snapshot.border === "warning" ? "yellow" : "green"

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={borderColor}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold color="green">prompt-sage </Text>
        <Text dimColor>observer</Text>
      </Box>

      <Text dimColor>◇ TRAJECTORY</Text>
      <Text color="green">› {(snapshot.trajectory ?? "Watching.").slice(0, width - 4)}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>✦ INSIGHT</Text>
        {snapshot.insight ? (
          <>
            <Text color={snapshot.insight.level === "critical" ? "red" : snapshot.insight.level === "warning" ? "yellow" : "cyan"} bold>
              {snapshot.insight.title}
            </Text>
            <Text>{snapshot.insight.body.slice(0, (width - 4) * 3)}</Text>
          </>
        ) : (
          <Text dimColor>No high-signal event yet.</Text>
        )}
      </Box>

      {snapshot.optimizedPrompt && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>⤳ REWRITE</Text>
          <Text color="magenta">{snapshot.optimizedPrompt.slice(0, (width - 4) * 3)}</Text>
          <Text color="magenta">{meter(snapshot.savingsPct ?? 0, Math.min(20, width - 10))} -{snapshot.savingsPct ?? 0}% tokens</Text>
        </Box>
      )}
    </Box>
  )
}
