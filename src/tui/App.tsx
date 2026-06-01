import React, { useState, useCallback, useRef, useEffect } from "react"
import { Box, useApp, useStdout } from "ink"
import { ConversationPane, type MessageItem } from "./ConversationPane.tsx"
import { SidePanel } from "./SidePanel.tsx"
import { runTurn } from "../agent/loop.ts"
import { ContextManager } from "../agent/context.ts"
import { ShadowMindAnalyzer, type ShadowSnapshot } from "../agent/shadow.ts"
import type { Provider } from "../providers/base.ts"
import type { PermissionGate } from "../agent/tools.ts"

const SIDEBAR_WIDTH = 44

interface Props {
  provider: Provider
  gate: PermissionGate
  initialTask?: string
}

const EMPTY_SNAPSHOT: ShadowSnapshot = {
  trajectory: "Watching session.",
  insight: null,
  optimizedPrompt: "",
  notes: "",
  border: "normal",
  savingsPct: 0,
}

function findLastToolCallIndex(messages: MessageItem[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.kind === "tool_call" && (m as Extract<MessageItem, { kind: "tool_call" }>).pending) {
      return i
    }
  }
  return -1
}

export function App({ provider, gate, initialTask }: Props) {
  const { exit: _exit } = useApp()
  const { stdout } = useStdout()
  const cols = stdout?.columns ?? 120

  const [messages, setMessages] = useState<MessageItem[]>([])
  const [streamingText, setStreamingText] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<ShadowSnapshot>(EMPTY_SNAPSHOT)

  const ctxRef = useRef(new ContextManager())
  const analyzerRef = useRef(new ShadowMindAnalyzer())

  const handleSubmit = useCallback(async (text: string) => {
    setInputValue("")
    setBusy(true)

    setMessages(prev => [...prev, { kind: "user", text }])
    analyzerRef.current.observe("stdin", text)

    let localStreaming = ""

    await runTurn(text, provider, ctxRef.current, gate, {
      onText: chunk => {
        localStreaming += chunk
        setStreamingText(localStreaming)
        analyzerRef.current.observe("stdout", chunk)
        const snap = analyzerRef.current.snapshot()
        setSnapshot({ ...snap, savingsPct: 0 } as ShadowSnapshot)
      },
      onToolCall: (name, args) => {
        setMessages(prev => [
          ...prev,
          { kind: "tool_call", name, args, pending: true },
        ])
        setStreamingText("")
        localStreaming = ""
      },
      onToolResult: (_name, result) => {
        setMessages(prev => {
          const copy = [...prev]
          const last = findLastToolCallIndex(copy)
          if (last >= 0) {
            copy[last] = { ...(copy[last] as Extract<MessageItem, { kind: "tool_call" }>), result, pending: false }
          }
          return copy
        })
      },
      onError: err => {
        setMessages(prev => [...prev, { kind: "assistant", text: `Error: ${err}` }])
      },
    })

    if (localStreaming) {
      setMessages(prev => [...prev, { kind: "assistant", text: localStreaming }])
      setStreamingText("")
    }

    setBusy(false)
  }, [provider, gate])

  useEffect(() => {
    if (initialTask) {
      void handleSubmit(initialTask)
    }
  }, []) // intentionally runs once on mount

  const mainWidth = Math.max(40, cols - SIDEBAR_WIDTH - 2)

  return (
    <Box flexDirection="row" width={cols}>
      <Box width={mainWidth}>
        <ConversationPane
          messages={messages}
          streamingText={streamingText}
          inputValue={inputValue}
          onSubmit={handleSubmit}
          onInputChange={setInputValue}
          busy={busy}
        />
      </Box>
      <SidePanel snapshot={snapshot} width={SIDEBAR_WIDTH} />
    </Box>
  )
}
