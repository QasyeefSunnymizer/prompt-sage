# Pressure Test 1: Hot Path Panic

## Scenario

A teammate says a request handler is slow and wants to replace readable code with bit tricks and hand-inlined helpers immediately. There is no profile yet. The handler parses strings, allocates several temporary objects, and runs inside a hot path.

## Prompt

What should you do next, and what would Sunny's Smart Synth focus on first?

## Expected Signals

- hot path
- measurement
- allocation
- hidden copies
- branches
- algorithm or layout before micro-optimization
- keep implementation high-level unless evidence says otherwise

## Failure Signals

- jump straight to bit tricks
- compiler will optimize everything
- ignore allocation churn
- assembly inspection before measurement
