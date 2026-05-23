const { spawnSync, execSync } = require("node:child_process");

const SUPPORTED_MANAGERS = new Set(["winget", "choco", "brew", "apt", "dnf"]);

function hasCommand(command, runner = spawnSync) {
  const probeArgs = command === "choco" ? ["-v"] : ["--version"];
  const result = runner(command, probeArgs, { stdio: "ignore", shell: false });
  return !!result && result.status === 0;
}

function detectManager(platform = process.platform, probe = hasCommand) {
  const forced = (process.env.PROMPT_SAGE_UPDATE_MANAGER || "").trim().toLowerCase();
  if (forced) {
    if (SUPPORTED_MANAGERS.has(forced)) return forced;
    throw new Error(`Unsupported PROMPT_SAGE_UPDATE_MANAGER '${forced}'.`);
  }

  if (platform === "win32") {
    if (probe("winget")) return "winget";
    if (probe("choco")) return "choco";
    throw new Error("No supported Windows package manager found (winget/choco).");
  }

  if (platform === "darwin") {
    if (probe("brew")) return "brew";
    throw new Error("Homebrew is required for self-update on macOS.");
  }

  if (platform === "linux") {
    if (probe("apt")) return "apt";
    if (probe("dnf")) return "dnf";
    throw new Error("No supported Linux package manager found (apt/dnf).");
  }

  throw new Error(`Unsupported platform '${platform}'.`);
}

function buildCommands(manager) {
  if (manager === "winget") return [["winget", "upgrade", "prompt-sage"]];
  if (manager === "choco") return [["choco", "upgrade", "prompt-sage", "-y"]];
  if (manager === "brew") return [["brew", "update"], ["brew", "upgrade", "prompt-sage"]];
  if (manager === "apt") return [["sudo", "apt", "update"], ["sudo", "apt", "install", "--only-upgrade", "-y", "prompt-sage"]];
  if (manager === "dnf") return [["sudo", "dnf", "upgrade", "-y", "prompt-sage"]];
  throw new Error(`Unsupported manager '${manager}'.`);
}

function formatCommands(commands) {
  return commands.map((parts) => parts.join(" ")).join(" && ");
}

function runSelfUpdate(options = {}) {
  const platform = options.platform || process.platform;
  const probe = options.probe || hasCommand;
  const run = options.run || execSync;
  const dryRun = !!options.dryRun;

  const manager = detectManager(platform, probe);
  const commands = buildCommands(manager);
  const shellCommand = formatCommands(commands);

  if (dryRun) {
    return { manager, command: shellCommand, dryRun: true };
  }

  for (const parts of commands) {
    run(parts.join(" "), { stdio: "inherit" });
  }

  return { manager, command: shellCommand, dryRun: false };
}

module.exports = {
  SUPPORTED_MANAGERS,
  hasCommand,
  detectManager,
  buildCommands,
  formatCommands,
  runSelfUpdate,
};
