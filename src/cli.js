#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { SageMode } = require("./sage-mode");
const { runSelfUpdate } = require("./self-update");
const ui = require("./terminal-ui");

function candidateRustBins() {
  const exe = process.platform === "win32" ? ".exe" : "";
  return [
    process.env.PROMPT_SAGE_BIN,
    path.join(__dirname, "..", "rust", "prompt-sage-rs", "target", "release", `prompt-sage${exe}`),
    path.join(__dirname, "..", "rust", "prompt-sage-rs", "target", "debug", `prompt-sage${exe}`),
    path.join(__dirname, "..", "bin", `prompt-sage${exe}`),
  ].filter(Boolean);
}

function runRustCliIfAvailable(args) {
  if (process.env.PROMPT_SAGE_JS_FALLBACK === "1") return false;

  for (const bin of candidateRustBins()) {
    if (!fs.existsSync(bin)) continue;
    const result = spawnSync(bin, args, { stdio: "inherit" });
    if (result.error) continue;
    process.exit(result.status ?? 1);
  }

  return false;
}

runRustCliIfAvailable(process.argv.slice(2));

const mode = new SageMode();
const [cmd, ...rest] = process.argv.slice(2);

if (!cmd) {
  console.log(ui.usage());
  process.exit(0);
}

if (cmd.toLowerCase() === "sidecar") {
  const sidecar = path.join(__dirname, "sidecar", "cli.mjs");
  const result = spawnSync("bun", [sidecar, ...rest], { stdio: "inherit" });
  if (result.error) {
    console.error(ui.error("Sidecar requires Bun.", "Install Bun, then rerun the command."));
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

if (cmd.toLowerCase() === "self-update") {
  const dryRun = rest.includes("--dry-run");
  try {
    const result = runSelfUpdate({ dryRun });
    console.log(ui.updateStatus(result));
    process.exit(0);
  } catch (err) {
    console.error(ui.error(err.message));
    process.exit(1);
  }
}

const parsed = mode.parseCommand(cmd);
if (parsed.type === "error") {
  console.error(ui.error(parsed.error));
  process.exit(1);
}

if (!rest.length) {
  console.log(ui.parseStatus(parsed));
  process.exit(0);
}

const input = rest.join(" ");
const out = mode.respond(input);
console.log(out.text);
