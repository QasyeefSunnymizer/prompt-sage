#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const templates = {
  codex: "templates/codex-instructions.md",
  claude: "templates/claude-instructions.md",
  gemini: "templates/gemini-instructions.md",
  cursor: "templates/cursor-instructions.md",
  copilot: "templates/copilot-instructions.md",
};

const target = process.argv[2];
if (!target || !templates[target]) {
  console.log("Usage: node install/install.js <codex|claude|gemini|cursor|copilot>");
  process.exit(1);
}

const sourcePath = path.join(__dirname, templates[target]);
const content = fs.readFileSync(sourcePath, "utf8");
console.log(content);

