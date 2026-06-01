import { test, expect, describe } from "bun:test";
import { DEFAULT_ENCODING, countTokens, summarizePrompt } from "../src/token-stats.ts";

describe("token-stats", () => {
  test("countTokens is deterministic for known string", () => {
    const input = "The deploy failed because config value is missing.";
    const a = countTokens(input, DEFAULT_ENCODING);
    const b = countTokens(input, DEFAULT_ENCODING);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  test("ultra is generally less or equal to full on a sample", () => {
    const sample = "Your auth middleware opens a new database connection for every request.";
    const fullStats = summarizePrompt(sample, "full", DEFAULT_ENCODING);
    const ultraStats = summarizePrompt(sample, "ultra", DEFAULT_ENCODING);
    expect(ultraStats.mode).toBeLessThanOrEqual(fullStats.mode);
  });
});
