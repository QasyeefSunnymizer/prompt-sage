const ANSI_RE = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g;
const CONTROL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

const RISKY_COMMAND_RE =
  /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-fd|drop\s+table|truncate\s+table|format\s+[a-z]:|Remove-Item\b.*\s-Recurse)\b/i;
const FAILURE_RE =
  /\b(error|failed|failure|panic|exception|traceback|exit code\s+[1-9]|tests?\s+failed|compilation failed)\b/i;
const SUCCESS_RE = /\b(done|fixed|implemented|complete|completed|summary|all tests pass|tests passed)\b/i;
const TEST_RE = /\b(npm test|cargo test|pytest|go test|pnpm test|yarn test|node --test|tests? passed)\b/i;

function normalizeTerminalText(text) {
  return String(text || "")
    .replace(ANSI_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function compactLine(text, max = 120) {
  const single = normalizeTerminalText(text).replace(/\s+/g, " ");
  if (single.length <= max) return single;
  return `${single.slice(0, max - 1)}...`;
}

function fingerprintFailure(text) {
  const normalized = normalizeTerminalText(text)
    .toLowerCase()
    .split("\n")
    .map((line) => line.replace(/[a-z]:\\[^:\s]+/gi, "<path>").replace(/\/[^\s:]+/g, "<path>"))
    .map((line) => line.replace(/\d+/g, "<n>").trim())
    .filter(Boolean);

  const failureLine = normalized.find((line) => FAILURE_RE.test(line));
  return failureLine ? failureLine.slice(0, 140) : "";
}

function looksVaguePrompt(text) {
  const prompt = normalizeTerminalText(text);
  if (prompt.length < 4) return false;
  if (!/\b(fix|make|add|update|change|implement|improve|debug|review)\b/i.test(prompt)) return false;

  const hasScope = /\b(file|function|test|repro|constraint|only|specific|verify|run|expected|actual)\b/i.test(prompt);
  const isShort = prompt.split(/\s+/).length <= 18;
  return isShort || !hasScope;
}

function optimizePrompt(text) {
  const intent = compactLine(text, 90);
  return [
    `Task: ${intent}`,
    "Find the smallest relevant files first.",
    "State the suspected cause before editing.",
    "Make a scoped fix only.",
    "Run the narrowest useful verification and report the result.",
  ].join(" ");
}

function classifyEvent({ source, text }) {
  const clean = normalizeTerminalText(text);
  if (!clean) return "noise";
  if (source === "stdin") return "user_input";
  if (RISKY_COMMAND_RE.test(clean)) return "risk";
  if (FAILURE_RE.test(clean)) return "failure";
  if (TEST_RE.test(clean)) return "test";
  if (SUCCESS_RE.test(clean)) return "summary";
  return "agent_output";
}

class ShadowMindAnalyzer {
  constructor(options = {}) {
    this.maxEvents = options.maxEvents || 80;
    this.loopThreshold = options.loopThreshold || 2;
    this.events = [];
    this.failureCounts = new Map();
    this.lastUserPrompt = "";
    this.lastInsight = null;
    this.testsSeen = false;
    this.filesTouched = new Set();
  }

  observe(source, text) {
    const clean = normalizeTerminalText(text);
    if (!clean) return this.snapshot();

    const type = classifyEvent({ source, text: clean });
    const event = { type, source, text: clean, at: Date.now() };
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.shift();

    if (type === "user_input") {
      this.lastUserPrompt = clean;
    }
    if (type === "test") {
      this.testsSeen = true;
    }

    this.captureFiles(clean);
    this.lastInsight = this.scoreInsight(event);
    return this.snapshot();
  }

  captureFiles(text) {
    const matches = text.matchAll(/\b[\w./\\-]+\.(?:js|mjs|ts|tsx|rs|py|json|md|toml|yml|yaml)\b/g);
    for (const match of matches) {
      this.filesTouched.add(match[0]);
      if (this.filesTouched.size > 20) break;
    }
  }

  scoreInsight(event) {
    if (event.type === "risk") {
      return {
        level: "critical",
        title: "Risky Command",
        body: "Destructive command pattern detected. Require explicit user confirmation and verify the target path before running it.",
      };
    }

    if (event.type === "failure") {
      const fp = fingerprintFailure(event.text);
      if (fp) {
        const count = (this.failureCounts.get(fp) || 0) + 1;
        this.failureCounts.set(fp, count);
        if (count >= this.loopThreshold) {
          return {
            level: "warning",
            title: "Loop Detected",
            body: `Same failure signature seen ${count} times. Ask for one narrowed repro, inspect the exact failing path, then change one cause.`,
          };
        }
      }
      return {
        level: "warning",
        title: "Failure Signal",
        body: compactLine(event.text, 140),
      };
    }

    if (event.type === "user_input" && looksVaguePrompt(event.text)) {
      return {
        level: "info",
        title: "Prompt Can Be Sharper",
        body: "Add file scope, expected behavior, verification command, and constraints before asking the agent to edit.",
      };
    }

    if (event.type === "summary" && !this.testsSeen) {
      return {
        level: "warning",
        title: "Verification Gap",
        body: "Completion language appeared before a test signal. Ask for the narrowest verification command or a reason tests were skipped.",
      };
    }

    return null;
  }

  snapshot() {
    const recent = [...this.events].reverse();
    const latestAction = recent.find((event) => event.type !== "noise");
    const prompt = this.lastUserPrompt && looksVaguePrompt(this.lastUserPrompt)
      ? optimizePrompt(this.lastUserPrompt)
      : "";
    const files = [...this.filesTouched].slice(-4);

    return {
      trajectory: latestAction ? compactLine(latestAction.text, 120) : "Watching session.",
      insight: this.lastInsight,
      optimizedPrompt: prompt,
      notes: files.length ? `Recent files: ${files.join(", ")}` : "Observe-only. Copy suggestions; no command injection.",
      border: this.lastInsight?.level === "critical" ? "critical" : this.lastInsight?.level === "warning" ? "warning" : "normal",
    };
  }
}

module.exports = {
  ShadowMindAnalyzer,
  classifyEvent,
  fingerprintFailure,
  normalizeTerminalText,
  optimizePrompt,
};
