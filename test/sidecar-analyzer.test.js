const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ShadowMindAnalyzer,
  classifyEvent,
  fingerprintFailure,
  normalizeTerminalText,
  optimizePrompt,
} = require("../src/sidecar/analyzer");

test("normalizes ansi and control noise", () => {
  assert.equal(normalizeTerminalText("\x1b[31mError\x1b[0m\r\n"), "Error");
});

test("classifies risky commands before generic output", () => {
  assert.equal(classifyEvent({ source: "stdout", text: "rm -rf build" }), "risk");
});

test("fingerprints repeated failures without unstable numbers", () => {
  const one = fingerprintFailure("test failed at src/lib.rs:42 exit code 1");
  const two = fingerprintFailure("test failed at src/lib.rs:99 exit code 2");
  assert.equal(one, two);
});

test("emits loop insight after repeated failure", () => {
  const analyzer = new ShadowMindAnalyzer({ loopThreshold: 2 });
  analyzer.observe("stdout", "Error: expected 1 got 2 at test/foo.js:10");
  const snapshot = analyzer.observe("stdout", "Error: expected 3 got 4 at test/foo.js:20");
  assert.equal(snapshot.insight.title, "Loop Detected");
  assert.equal(snapshot.border, "warning");
});

test("rewrites vague prompts into scoped prompts", () => {
  const analyzer = new ShadowMindAnalyzer();
  const snapshot = analyzer.observe("stdin", "fix the tests");
  assert.match(snapshot.optimizedPrompt, /Task: fix the tests/);
  assert.match(snapshot.optimizedPrompt, /verification/);
  assert.match(optimizePrompt("make it work"), /smallest relevant files/);
});

test("rewrites very short vague prompts", () => {
  const analyzer = new ShadowMindAnalyzer();
  const snapshot = analyzer.observe("stdin", "fix it");
  assert.equal(snapshot.insight.title, "Prompt Can Be Sharper");
  assert.match(snapshot.optimizedPrompt, /Task: fix it/);
});
