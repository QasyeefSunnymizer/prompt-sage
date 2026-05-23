const test = require("node:test");
const assert = require("node:assert/strict");
const {
  detectManager,
  buildCommands,
  runSelfUpdate,
} = require("../src/self-update");

test("detectManager prefers winget on Windows when available", () => {
  const manager = detectManager("win32", (cmd) => cmd === "winget");
  assert.equal(manager, "winget");
});

test("detectManager falls back to choco on Windows", () => {
  const manager = detectManager("win32", (cmd) => cmd === "choco");
  assert.equal(manager, "choco");
});

test("buildCommands creates apt upgrade sequence", () => {
  const commands = buildCommands("apt");
  assert.deepEqual(commands, [
    ["sudo", "apt", "update"],
    ["sudo", "apt", "install", "--only-upgrade", "-y", "prompt-sage"],
  ]);
});

test("runSelfUpdate executes all commands in order", () => {
  const ran = [];
  const result = runSelfUpdate({
    platform: "linux",
    probe: (cmd) => cmd === "dnf",
    run: (command) => {
      ran.push(command);
    },
  });

  assert.equal(result.manager, "dnf");
  assert.deepEqual(ran, ["sudo dnf upgrade -y prompt-sage"]);
});

test("runSelfUpdate supports dry-run", () => {
  const result = runSelfUpdate({
    platform: "darwin",
    probe: (cmd) => cmd === "brew",
    dryRun: true,
  });

  assert.equal(result.manager, "brew");
  assert.equal(result.dryRun, true);
  assert.match(result.command, /brew update/);
  assert.match(result.command, /brew upgrade prompt-sage/);
});
