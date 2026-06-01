import React from "react"
import { Box, Text } from "ink"

interface Props {
  name: string
  args: Record<string, unknown>
  result?: string
  pending?: boolean
}

export function ToolCallRow({ name, args, result, pending = false }: Props) {
  const argStr = Object.entries(args)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ")

  return (
    <Box flexDirection="column" marginY={0}>
      <Box>
        <Text color="cyan">⚙ </Text>
        <Text color="cyan" bold>{name}</Text>
        <Text color="gray"> {argStr}</Text>
        {pending && <Text color="yellow"> …</Text>}
      </Box>
      {result != null && (
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            {result.slice(0, 200)}{result.length > 200 ? "…" : ""}
          </Text>
        </Box>
      )}
    </Box>
  )
}
