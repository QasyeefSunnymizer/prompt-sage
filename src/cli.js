#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { SageMode } = require("./sage-mode");
const { runSelfUpdate } = require("./self-update");

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
  console.log("Usage: prompt-sage \"/sage [lite|full|ultra|master|roleplay]\" \"text\"");
  console.log("       prompt-sage self-update [--dry-run]");
  process.exit(0);
}

if (cmd.toLowerCase() === "self-update") {
  const dryRun = rest.includes("--dry-run");
  try {
    const result = runSelfUpdate({ dryRun });
    if (result.dryRun) {
      console.log(`Detected ${result.manager}. Would run: ${result.command}`);
    } else {
      console.log(`prompt-sage updated via ${result.manager}.`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

const parsed = mode.parseCommand(cmd);
if (parsed.type === "error") {
  console.error(parsed.error);
  process.exit(1);
}

if (!rest.length) {
  console.log(JSON.stringify(parsed, null, 2));
  process.exit(0);
}

const input = rest.join(" ");
const out = mode.respond(input);
console.log(out.text);
