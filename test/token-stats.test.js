const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { DEFAULT_ENCODING, countTokens, summarizePrompt } = require("../src/token-stats");
const samples = require("../scripts/sage-samples");

test("countTokens is deterministic for known string", () => {
  const input = "The deploy failed because config value is missing.";
  const a = countTokens(input, DEFAULT_ENCODING);
  const b = countTokens(input, DEFAULT_ENCODING);
  assert.equal(a, b);
  assert.ok(a > 0);
});

test("ultra is generally less than or equal to full on benchmark prompts", () => {
  for (const sample of samples) {
    const fullStats = summarizePrompt(sample, "full", DEFAULT_ENCODING);
    const ultraStats = summarizePrompt(sample, "ultra", DEFAULT_ENCODING);
    assert.ok(
      ultraStats.mode <= fullStats.mode,
      `Expected ultra<=full for sample: ${sample}\nfull=${fullStats.mode}, ultra=${ultraStats.mode}`
    );
  }
});

test("internal stats script prints required columns and all modes", () => {
  const scriptPath = path.join(__dirname, "..", "scripts", "stats-sage.js");
  const output = execFileSync(process.execPath, [scriptPath], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });

  assert.match(output, /\bbaseline\b/i);
  assert.match(output, /\bmode\b/i);
  assert.match(output, /\bsaved\b/i);
  assert.match(output, /(^|\s)%($|\s)/m);
  assert.match(output, /\blite\b/);
  assert.match(output, /\bfull\b/);
  assert.match(output, /\bultra\b/);
  assert.match(output, /\bmaster\b/);
  assert.match(output, /Summary by mode/);
});
