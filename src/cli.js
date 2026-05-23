#!/usr/bin/env node
const { SageMode } = require("./sage-mode");

const mode = new SageMode();
const [cmd, ...rest] = process.argv.slice(2);

if (!cmd) {
  console.log("Usage: node src/cli.js \"/sage [lite|full|ultra|master|roleplay]\" \"text\"");
  process.exit(0);
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
