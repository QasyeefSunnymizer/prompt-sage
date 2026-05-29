#!/usr/bin/env bun
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { ShadowMindAnalyzer } = require("./analyzer.js");
const { createLineDecoder, encodeFrame } = require("./bridge-protocol.js");
const NODE_PTY_BRIDGE = require.resolve("./pty-node-bridge.cjs");
const blessed = require("blessed");

function usage() {
  console.log("Usage: prompt-sage sidecar <claude|codex|command> [args...]");
  console.log("Runs the target CLI in a PTY and mirrors the stream into Prompt Sage.");
}

function resolveCommand(argv) {
  return argv.length ? argv : null;
}

function fit(text, width) {
  const size = Math.max(0, Number(width) || 0);
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean.padEnd(size, " ");
  if (size <= 3) return clean.slice(0, size);
  return `${clean.slice(0, size - 3)}...`;
}

function wrapText(text, width, maxLines = 3) {
  const size = Math.max(8, Number(width) || 40);
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let line = "";
  for (const word of words) {
    const token = word.length > size ? fit(word, size) : word;
    if (!line) {
      line = token;
    } else if (line.length + token.length + 1 <= size) {
      line = `${line} ${token}`;
    } else {
      lines.push(line);
      line = token;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    const last = lines.length - 1;
    lines[last] = fit(lines[last], size);
  }
  return lines;
}

function sectionBlock(title, body, width, maxLines = 3) {
  const lines = [`{bold}${title}{/bold}`];
  const wrapped = wrapText(body, width, maxLines);
  for (const line of wrapped) lines.push(line || " ");
  return lines;
}

function copyOsc52(text) {
  const payload = Buffer.from(text, "utf8").toString("base64");
  process.stderr.write(`\x1b]52;c;${payload}\x07`);
}

async function pipeReadable(readable, source, onData) {
  if (!readable) return;
  for await (const chunk of readable) {
    onData(source, chunk);
  }
}

function isBunPtyUnsupportedError(err) {
  return /terminal option is not supported/i.test(err?.message || "");
}

function isNodePtyBridgeAvailable() {
  try {
    require.resolve("@homebridge/node-pty-prebuilt-multiarch");
    return true;
  } catch {
    return false;
  }
}

function selectTargetBackend({ platform = process.platform, bunPtyError = null, bridgeAvailable = true } = {}) {
  if (platform === "win32") return bridgeAvailable ? "node-pty-bridge" : "pipe";
  if (bunPtyError && isBunPtyUnsupportedError(bunPtyError)) {
    return bridgeAvailable ? "node-pty-bridge" : "pipe";
  }
  return "bun-pty";
}

function selectUiMode({ env = process.env, isTTY = process.stdout.isTTY } = {}) {
  if (!isTTY || env.PROMPT_SAGE_NO_UI === "1") return "silent";
  return "blessed";
}

function calculatePaneSizes(totalCols = process.stdout.columns || 100) {
  const cols = Math.max(40, Number(totalCols) || 100);
  const sidebarCols = cols >= 120 ? 46 : cols >= 86 ? 42 : cols >= 80 ? 40 : Math.max(0, cols - 40);
  return {
    hostCols: Math.max(40, cols - sidebarCols),
    sidebarCols,
  };
}

function renderTerminalRows(term) {
  const buffer = term.buffer.active;
  const cursorRow = buffer.viewportY + buffer.cursorY;
  const rows = [];

  for (let row = 0; row < term.rows; row += 1) {
    const absoluteRow = buffer.viewportY + row;
    const line = buffer.getLine(absoluteRow);
    let text = line ? line.translateToString(false, 0, term.cols) : "";
    if (absoluteRow === cursorRow && buffer.cursorX < term.cols) {
      const index = Math.max(0, buffer.cursorX);
      text = `${text.slice(0, index)}█${text.slice(index + 1)}`;
    }
    rows.push(text);
  }

  return rows.join("\n");
}

function createBlessedSplitUi(snapshotRef) {
  if (!globalThis.window) globalThis.window = globalThis;
  const { Terminal } = require("xterm-headless");
  let layout = calculatePaneSizes();
  const rows = process.stdout.rows || 30;
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    dockBorders: true,
    title: "Prompt Sage Sidecar",
  });

  const terminalBox = blessed.box({
    top: 0,
    left: 0,
    width: layout.hostCols,
    height: "100%",
    tags: false,
    scrollable: false,
    alwaysScroll: false,
  });

  const sidebar = blessed.box({
    top: 0,
    right: 0,
    width: layout.sidebarCols,
    height: "100%",
    border: "line",
    tags: true,
    padding: { top: 1, left: 2, right: 2 },
    style: {
      fg: "#d8dee9",
      bg: "#111318",
      border: { fg: "#4f5b66" },
    },
  });

  screen.append(terminalBox);
  if (layout.sidebarCols > 0) screen.append(sidebar);

  const term = new Terminal({
    cols: layout.hostCols,
    rows,
    allowProposedApi: true,
    scrollback: 1000,
    windowsMode: process.platform === "win32",
  });

  let renderQueued = false;
  const render = () => {
    renderQueued = false;
    terminalBox.setContent(renderTerminalRows(term));
    const snap = snapshotRef.current;
    const contentWidth = Math.max(16, layout.sidebarCols - 8);
    const status =
      snap.border === "critical" ? "{red-fg}critical{/red-fg}"
        : snap.border === "warning" ? "{yellow-fg}attention{/yellow-fg}"
          : "{green-fg}observing{/green-fg}";
    const insight = snap.insight
      ? `${snap.insight.title}: ${snap.insight.body}`
      : "No high-signal intervention yet.";
    sidebar.setContent([
      "{bold}Prompt Sage{/bold}",
      status,
      "",
      ...sectionBlock("Trajectory", snap.trajectory || "Watching session.", contentWidth, 3),
      "",
      ...sectionBlock("Insight", insight, contentWidth, 4),
      "",
      ...sectionBlock("Rewrite", snap.optimizedPrompt || "No rewrite candidate.", contentWidth, 4),
      "",
      ...sectionBlock("Notes", snap.notes, contentWidth, 3),
      "",
      "{#7f8c98-fg}Ctrl+] copies rewrite{/}",
    ].join("\n"));
    sidebar.style.border.fg = snap.border === "critical" ? "#d75f5f" : snap.border === "warning" ? "#c8a94a" : "#5f875f";
    screen.render();
  };
  const queueRender = () => {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(render, 16);
  };

  render();

  return {
    cols: layout.hostCols,
    rows,
    writeOutput(data) {
      term.write(data, queueRender);
    },
    updateSnapshot() {
      queueRender();
    },
    copy(text) {
      if (text) copyOsc52(text);
    },
    resize() {
      const next = calculatePaneSizes();
      const nextRows = process.stdout.rows || rows;
      layout = next;
      terminalBox.width = next.hostCols;
      sidebar.width = next.sidebarCols;
      if (next.sidebarCols > 0 && !sidebar.parent) screen.append(sidebar);
      if (next.sidebarCols <= 0 && sidebar.parent) sidebar.detach();
      term.resize(next.hostCols, nextRows);
      queueRender();
      return { cols: next.hostCols, rows: nextRows };
    },
    close() {
      term.dispose();
      screen.destroy();
    },
  };
}

function createTextWriter(stdin) {
  if (!stdin) return () => {};
  if (typeof stdin.write === "function") {
    return (data) => stdin.write(data);
  }

  const writer = typeof stdin.getWriter === "function" ? stdin.getWriter() : null;
  if (!writer) return () => {};

  return (data) => {
    const bytes = data instanceof Uint8Array ? data : Buffer.from(String(data), "utf8");
    writer.write(bytes);
  };
}

function spawnBunPty(command, cols, rows, onData) {
  const proc = Bun.spawn(command, {
    env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
    terminal: {
      cols,
      rows,
      name: "xterm-256color",
      data(_terminal, data) {
        onData("stdout", data);
      },
    },
  });

  return {
    backend: "bun-pty",
    exited: proc.exited,
    write(data) {
      proc.terminal.write(data);
    },
    resize(nextCols, nextRows) {
      proc.terminal.resize(nextCols, nextRows);
    },
    close() {
      proc.terminal.close();
    },
  };
}

function createBridgeWriter(stdin) {
  const write = createTextWriter(stdin);
  return (frame) => {
    write(encodeFrame(frame));
  };
}

async function pipeBridgeReadable(readable, onData) {
  if (!readable) return;
  const decoder = createLineDecoder(
    (frame) => {
      if (frame.type !== "data") return;
      const data = String(frame.data || "");
      onData("stdout", data);
    },
    (err) => {
      process.stderr.write(`Invalid PTY bridge output: ${err.message}\n`);
    },
  );

  for await (const chunk of readable) decoder.push(chunk);
  decoder.flush();
}

function spawnNodePtyBridge(command, cols, rows, onData) {
  const [target, ...args] = command;
  const proc = Bun.spawn([
    process.env.PROMPT_SAGE_NODE || "node",
    NODE_PTY_BRIDGE,
    "--cols",
    String(cols),
    "--rows",
    String(rows),
    "--",
    target,
    ...args,
  ], {
    env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const send = createBridgeWriter(proc.stdin);
  pipeBridgeReadable(proc.stdout, onData);
  pipeReadable(proc.stderr, "stderr", onData);

  return {
    backend: "node-pty-bridge",
    exited: proc.exited,
    write(data) {
      send({ type: "input", data: Buffer.from(data).toString("utf8") });
    },
    resize(nextCols, nextRows) {
      send({ type: "resize", cols: nextCols, rows: nextRows });
    },
    close() {
      send({ type: "kill" });
    },
  };
}

function spawnPipeFallback(command, onData) {
  onData(
    "stderr",
    "Interactive PTY unavailable; using noninteractive pipe-mode sidecar. Run npm install, verify node --version, then rerun npm link/build steps if this was a local checkout.\n",
  );
  const proc = Bun.spawn(command, {
    env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  pipeReadable(proc.stdout, "stdout", onData);
  pipeReadable(proc.stderr, "stderr", onData);
  const write = createTextWriter(proc.stdin);

  return {
    backend: "pipe",
    exited: proc.exited,
    write(data) {
      write(data);
    },
    resize() {},
    close() {
      proc.stdin?.end?.();
    },
  };
}

function spawnTarget(command, cols, rows, onData) {
  const bridgeAvailable = isNodePtyBridgeAvailable();
  const initialBackend = selectTargetBackend({ bridgeAvailable });

  if (initialBackend === "node-pty-bridge") {
    return spawnNodePtyBridge(command, cols, rows, onData);
  }
  if (initialBackend === "pipe") {
    return spawnPipeFallback(command, onData);
  }

  try {
    return spawnBunPty(command, cols, rows, onData);
  } catch (err) {
    const backend = selectTargetBackend({ bunPtyError: err, bridgeAvailable });
    if (backend === "node-pty-bridge") {
      onData("stderr", "Bun PTY unsupported on this platform; using Node ConPTY bridge.\n");
      return spawnNodePtyBridge(command, cols, rows, onData);
    }
    if (backend === "pipe") {
      return spawnPipeFallback(command, onData);
    }
    throw err;
  }
}

async function main() {
  const command = resolveCommand(process.argv.slice(2));
  if (!command) {
    usage();
    process.exit(0);
  }

  if (typeof Bun === "undefined" || !Bun.spawn) {
    console.error("prompt-sage sidecar requires Bun for PTY support.");
    process.exit(1);
  }

  const analyzer = new ShadowMindAnalyzer();
  const snapshotRef = { current: analyzer.snapshot() };
  const uiMode = selectUiMode();
  const ui = uiMode === "blessed" ? createBlessedSplitUi(snapshotRef) : null;

  const onData = (source, data) => {
    if (ui) {
      ui.writeOutput(data);
    } else {
      process[source === "stderr" ? "stderr" : "stdout"].write(data);
    }
    snapshotRef.current = analyzer.observe(source, Buffer.from(data).toString("utf8"));
    ui?.updateSnapshot();
  };

  const cols = ui?.cols || process.stdout.columns || 100;
  const rows = ui?.rows || process.stdout.rows || 30;
  const proc = spawnTarget(command, cols, rows, onData);

  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (chunk) => {
    if (chunk.length === 1 && chunk[0] === 0x1d && snapshotRef.current.optimizedPrompt) {
      if (ui) {
        ui.copy(snapshotRef.current.optimizedPrompt);
      } else {
        copyOsc52(snapshotRef.current.optimizedPrompt);
      }
      return;
    }

    snapshotRef.current = analyzer.observe("stdin", Buffer.from(chunk).toString("utf8"));
    ui?.updateSnapshot();
    proc.write(chunk);
  });

  process.on("SIGWINCH", () => {
    const next = ui?.resize() || { cols: process.stdout.columns || cols, rows: process.stdout.rows || rows };
    proc.resize(next.cols, next.rows);
  });

  process.on("SIGINT", () => {
    proc.write("\x03");
  });

  const exitCode = await proc.exited;
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  ui?.close();
  proc.close();
  process.exit(exitCode ?? 0);
}

const runningAsMain = typeof Bun !== "undefined" && import.meta.path === Bun.main;
if (runningAsMain) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

export {
  calculatePaneSizes,
  createTextWriter,
  isBunPtyUnsupportedError,
  selectUiMode,
  selectTargetBackend,
  wrapText,
};
