function encodeFrame(frame) {
  if (!frame || typeof frame.type !== "string") {
    throw new TypeError("bridge frame requires a string type");
  }
  return `${JSON.stringify(frame)}\n`;
}

function parseFrame(line) {
  const frame = JSON.parse(line);
  if (!frame || typeof frame.type !== "string") {
    throw new Error("bridge frame requires a string type");
  }
  return frame;
}

function createLineDecoder(onFrame, onError = () => {}) {
  let buffer = "";

  return {
    push(chunk) {
      buffer += Buffer.from(chunk).toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onFrame(parseFrame(line));
        } catch (err) {
          onError(err, line);
        }
      }
    },
    flush() {
      const line = buffer.trim();
      buffer = "";
      if (!line) return;
      try {
        onFrame(parseFrame(line));
      } catch (err) {
        onError(err, line);
      }
    },
  };
}

module.exports = {
  createLineDecoder,
  encodeFrame,
  parseFrame,
};
