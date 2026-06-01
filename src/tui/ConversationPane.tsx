import React from "react"
import { Box, Text, useInput } from "ink"
import { ToolCallRow } from "./ToolCallRow.tsx"

export type MessageItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool_call"; name: string; args: Record<string, unknown>; result?: string; pending: boolean }

interface Props {
  messages: MessageItem[]
  streamingText: string
  inputValue: string
  onSubmit: (text: string) => void
  onInputChange: (text: string) => void
  busy: boolean
}

export function ConversationPane({
  messages,
  streamingText,
  inputValue,
  onSubmit,
  onInputChange,
  busy,
}: Props) {
  useInput((input, key) => {
    if (busy) return
    if (key.return) {
      if (inputValue.trim()) onSubmit(inputValue.trim())
      return
    }
    if (key.backspace || key.delete) {
      onInputChange(inputValue.slice(0, -1))
      return
    }
    if (!key.ctrl && !key.meta && input) {
      onInputChange(inputValue + input)
    }
  })

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.map((msg, i) => {
        if (msg.kind === "user") {
          return (
            <Box key={i} marginY={0}>
              <Text color="green" bold>▶ </Text>
              <Text>{msg.text}</Text>
            </Box>
          )
        }
        if (msg.kind === "assistant") {
          return (
            <Box key={i} marginY={0}>
              <Text color="white">{msg.text}</Text>
            </Box>
          )
        }
        if (msg.kind === "tool_call") {
          return (
            <ToolCallRow
              key={i}
              name={msg.name}
              args={msg.args}
              result={msg.result}
              pending={msg.pending}
            />
          )
        }
        return null
      })}

      {streamingText.length > 0 && (
        <Text color="white">{streamingText}</Text>
      )}

      <Box marginTop={1}>
        <Text color="green">❯ </Text>
        <Text>{inputValue}</Text>
        {!busy && <Text color="green">█</Text>}
        {busy && <Text color="yellow"> thinking…</Text>}
      </Box>
    </Box>
  )
}
