# Pressure Test 2: Data Layout Fight

## Scenario

Two designs exist for a throughput-sensitive pipeline. One uses a contiguous array of compact records. The other uses a graph of heap objects linked by pointers because it feels more extensible. Access is mostly sequential scans with occasional updates.

## Prompt

How should Sunny's Smart Synth evaluate the tradeoff?

## Expected Signals

- layout
- contiguous
- pointer
- indirection
- alignment
- lifetime
- hot and cold fields or flattening

## Failure Signals

- pick object graph for abstraction alone
- ignore sequential access pattern
- ignore pointer chasing
- discuss style only
