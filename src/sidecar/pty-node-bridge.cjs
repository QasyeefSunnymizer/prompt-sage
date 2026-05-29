#!/usr/bin/env node
const process = require("node:process");
const { spawnSync } = require("node:child_process");
const { createLineDecoder, encodeFrame } = require("./bridge-protocol");

function parseArgs(argv) {
  const separator = argv.indexOf("--");
  if (separator === -1) {
    throw new Error("Usage: pty-node-bridge.cjs --cols <n> --rows <n> -- <command> [args...]");
  }

  const options = { cols: 80, rows: 24 };
  for (let index = 0; index < separator; index += 1) {
    const arg = argv[index];
    if (arg === "--cols") {
      options.cols = Number(argv[++index]);
    } else if (arg === "--rows") {
      options.rows = Number(argv[++index]);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  const command = argv[separator + 1];
  if (!command) throw new Error("PTY bridge requires a command");
  return {
    ...options,
    command,
    args: argv.slice(separator + 2),
  };
}

function writeFrame(frame) {
  process.stdout.write(encodeFrame(frame));
}

function loadPty() {
  try {
    return require("@homebridge/node-pty-prebuilt-multiarch");
  } catch (err) {
    err.message = `Failed to load @homebridge/node-pty-prebuilt-multiarch. Run npm install, then retry. ${err.message}`;
    throw err;
  }
}

function quoteForCmd(value) {
  const text = String(value);
  if (/^[\w@%+=:,./\\-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function selectWindowsRunnable(matches) {
  return matches.find((line) => /\.(?:cmd|bat)$/i.test(line))
    || matches.find((line) => /\.exe$/i.test(line))
    || matches[0]
    || "";
}

function resolveWindowsCommand(command, args) {
  if (process.platform !== "win32") return { command, args };
  if (/[\\/]/.test(command)) return { command, args };

  const found = spawnSync("where.exe", [command], {
    encoding: "utf8",
    windowsHide: true,
  });
  const matches = found.status === 0
    ? found.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];
  const runnable = selectWindowsRunnable(matches);
  if (!runnable) return { command, args };

  if (/\.(?:cmd|bat)$/i.test(runnable)) {
    const commandLine = [runnable, ...args].map(quoteForCmd).join(" ");
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", commandLine],
    };
  }

  return { command: runnable, args };
}

function main() {
  const { command, args, cols, rows } = parseArgs(process.argv.slice(2));
  const pty = loadPty();
  const resolved = resolveWindowsCommand(command, args);
  const child = pty.spawn(resolved.command, resolved.args, {
    cols: Number.isFinite(cols) ? cols : 80,
    rows: Number.isFinite(rows) ? rows : 24,
    cwd: process.cwd(),
    env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
  });

  child.onData((data) => {
    writeFrame({ type: "data", data });
  });

  child.onExit(({ exitCode }) => {
    process.exit(exitCode ?? 0);
  });

  const decoder = createLineDecoder(
    (frame) => {
      if (frame.type === "input") {
        child.write(String(frame.data || ""));
      } else if (frame.type === "resize") {
        const nextCols = Number(frame.cols);
        const nextRows = Number(frame.rows);
        if (Number.isFinite(nextCols) && Number.isFinite(nextRows)) {
          child.resize(nextCols, nextRows);
        }
      } else if (frame.type === "kill") {
        child.kill();
      }
    },
    (err) => {
      process.stderr.write(`Invalid PTY bridge frame: ${err.message}\n`);
    },
  );

  process.stdin.on("data", (chunk) => decoder.push(chunk));
  process.stdin.on("end", () => decoder.flush());
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  resolveWindowsCommand,
  selectWindowsRunnable,
};
