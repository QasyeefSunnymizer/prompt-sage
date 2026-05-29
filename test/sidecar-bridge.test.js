const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const {
  createLineDecoder,
  encodeFrame,
  parseFrame,
} = require("../src/sidecar/bridge-protocol");
const { selectWindowsRunnable } = require("../src/sidecar/pty-node-bridge.cjs");

test("encodes and parses bridge JSON line frames", () => {
  const encoded = encodeFrame({ type: "input", data: "1+1\r" });
  assert.match(encoded, /\n$/);
  assert.deepEqual(parseFrame(encoded.trimEnd()), { type: "input", data: "1+1\r" });
});

test("line decoder handles chunked bridge frames", () => {
  const frames = [];
  const decoder = createLineDecoder((frame) => frames.push(frame));
  const payload = encodeFrame({ type: "data", data: "hello\nworld" });

  decoder.push(payload.slice(0, 8));
  decoder.push(payload.slice(8));

  assert.deepEqual(frames, [{ type: "data", data: "hello\nworld" }]);
});

test("line decoder reports invalid frames without stopping", () => {
  const frames = [];
  const errors = [];
  const decoder = createLineDecoder(
    (frame) => frames.push(frame),
    (err) => errors.push(err.message),
  );

  decoder.push("{bad json}\n");
  decoder.push(encodeFrame({ type: "resize", cols: 100, rows: 40 }));

  assert.equal(errors.length, 1);
  assert.deepEqual(frames, [{ type: "resize", cols: 100, rows: 40 }]);
});

test("sidecar selects Node PTY bridge for Windows and Bun PTY unsupported", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { selectTargetBackend } = await import(cliUrl.href);

  assert.equal(
    selectTargetBackend({ platform: "win32", bridgeAvailable: true }),
    "node-pty-bridge",
  );
  assert.equal(
    selectTargetBackend({
      platform: "linux",
      bridgeAvailable: true,
      bunPtyError: new Error("terminal option is not supported"),
    }),
    "node-pty-bridge",
  );
  assert.equal(
    selectTargetBackend({
      platform: "win32",
      bridgeAvailable: false,
    }),
    "pipe",
  );
});

test("sidecar selects Blessed split UI by default for TTY output", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { selectUiMode } = await import(cliUrl.href);

  assert.equal(selectUiMode({ env: {}, isTTY: true }), "blessed");
  assert.equal(selectUiMode({ env: { PROMPT_SAGE_NO_UI: "1" }, isTTY: true }), "silent");
  assert.equal(selectUiMode({ env: {}, isTTY: false }), "silent");
});

test("sidecar pane sizing preserves at least 40 hosted columns", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { calculatePaneSizes } = await import(cliUrl.href);

  for (const width of [40, 60, 79, 80, 100, 140]) {
    assert.ok(calculatePaneSizes(width).hostCols >= 40);
  }
  assert.deepEqual(calculatePaneSizes(140), { hostCols: 94, sidebarCols: 46 });
  assert.deepEqual(calculatePaneSizes(80), { hostCols: 40, sidebarCols: 40 });
});

test("sidecar sidebar wrapping keeps long text readable", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { wrapText } = await import(cliUrl.href);

  const lines = wrapText("Improve documentation in a specific file and verify the rendered output.", 24, 3);

  assert.ok(lines.length <= 3);
  assert.ok(lines.every((line) => line.length <= 24));
  assert.match(lines.join(" "), /Improve documentation/);
});

test("sidecar wrapping constrains long unbroken words", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { wrapText } = await import(cliUrl.href);

  const lines = wrapText("Supercalifragilisticexpialidocious", 12, 2);

  assert.ok(lines.every((line) => line.length <= 12));
});

test("sidecar text writer supports web writable stdin", async () => {
  const cliUrl = pathToFileURL(path.join(__dirname, "..", "src", "sidecar", "cli.mjs"));
  const { createTextWriter } = await import(cliUrl.href);
  const chunks = [];
  const stdin = {
    getWriter() {
      return {
        write(chunk) {
          chunks.push(Buffer.from(chunk).toString("utf8"));
        },
      };
    },
  };

  createTextWriter(stdin)("hello");

  assert.deepEqual(chunks, ["hello"]);
});

test("Windows command resolution prefers runnable npm cmd shim", () => {
  assert.equal(
    selectWindowsRunnable([
      "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex",
      "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex.cmd",
    ]),
    "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex.cmd",
  );
});
