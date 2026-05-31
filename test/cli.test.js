const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cli = path.join(__dirname, "..", "src", "cli.js");

function runCli(args, env = {}, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.rustFallback === false ? {} : { PROMPT_SAGE_JS_FALLBACK: "1" }),
      NO_COLOR: "1",
      ...env,
    },
  });
}

test("prompt-sage run without target prints run usage", () => {
  const result = runCli(["run"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /prompt-sage run <claude\|codex\|command>/);
});

test("prompt-sage run codex routes to Rust TUI runner", () => {
  const result = runCli(["run", "codex"], { PROMPT_SAGE_TEST_ROUTE: "1" });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "tui codex");
});

test("prompt-sage run route bypasses stale Rust CLI delegation", () => {
  const result = runCli(
    ["run", "codex"],
    { PROMPT_SAGE_TEST_ROUTE: "1" },
    { rustFallback: false },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "tui codex");
});

test("prompt-sage sidecar codex remains a hidden compatibility alias", () => {
  const result = runCli(["sidecar", "codex"], { PROMPT_SAGE_TEST_ROUTE: "1" });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "tui codex");
});

test("main help shows run and hides sidecar", () => {
  const result = runCli([]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /prompt-sage run <claude\|codex\|command>/);
  assert.doesNotMatch(result.stdout, /prompt-sage sidecar/);
});
