const BRAND = "prompt-sage";
const TAGLINE = "token-efficient agent communication";
const LEVELS = "lite | full | ultra | master | roleplay";

function shouldColor(stream = process.stdout) {
  return !!stream.isTTY && process.env.NO_COLOR !== "1";
}

function color(code, text, stream = process.stdout) {
  if (!shouldColor(stream)) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

function label(text) {
  return color("36;1", text);
}

function muted(text) {
  return color("2", text);
}

function success(text) {
  return color("32;1", text);
}

function warn(text) {
  return color("33;1", text, process.stderr);
}

function header() {
  return [
    `${label(BRAND)} ${muted(TAGLINE)}`,
    muted("=".repeat(56)),
  ];
}

function row(left, right) {
  return `  ${label(left.padEnd(12))} ${right}`;
}

function usage() {
  return [
    ...header(),
    "",
    label("Commands"),
    row("transform", `prompt-sage "/sage [${LEVELS}]" "text"`),
    row("sidecar", "prompt-sage sidecar <claude|codex|command> [args...]"),
    row("update", "prompt-sage self-update [--dry-run]"),
    "",
    label("Modes"),
    "  lite   gentle cleanup       full   default concise cadence",
    "  ultra  shortest practical   master/roleplay explicit heavy style",
  ].join("\n");
}

function sidecarUsage() {
  return [
    ...header(),
    "",
    label("Sidecar"),
    row("run", "prompt-sage sidecar <claude|codex|command> [args...]"),
    row("ui", "split PTY wrapper with Prompt Sage analysis docked right"),
    row("debug", "PROMPT_SAGE_NO_UI=1 disables the split wrapper"),
  ].join("\n");
}

function parseStatus(parsed) {
  return [
    ...header(),
    "",
    label("Mode"),
    row("state", parsed.active ? success("active") : muted("inactive")),
    row("level", parsed.level),
    row("event", parsed.type),
  ].join("\n");
}

function updateStatus(result) {
  return [
    ...header(),
    "",
    label("Update"),
    row("manager", result.manager),
    row(result.dryRun ? "would run" : "status", result.dryRun ? result.command : success("complete")),
  ].join("\n");
}

function error(message, hint) {
  const lines = [
    `${warn("prompt-sage error")} ${message}`,
  ];
  if (hint) lines.push(muted(`hint: ${hint}`));
  return lines.join("\n");
}

module.exports = {
  usage,
  sidecarUsage,
  parseStatus,
  updateStatus,
  error,
};
