const { LEVELS, transformText } = require("./style-engine");

class SageMode {
  constructor() {
    this.active = false;
    this.level = "full";
  }

  parseCommand(input) {
    const raw = (input || "").trim().toLowerCase();
    if (raw === "stop sage" || raw === "normal mode") {
      this.active = false;
      return { type: "stop", active: this.active, level: this.level };
    }
    if (!raw.startsWith("/sage")) return { type: "none", active: this.active, level: this.level };

    const [, arg] = raw.split(/\s+/, 2);
    if (arg && LEVELS.has(arg)) {
      this.level = arg;
    } else if (arg) {
      return { type: "error", error: `Unknown level '${arg}'. Use lite|full|ultra|master.` };
    }
    this.active = true;
    return { type: "start", active: this.active, level: this.level };
  }

  respond(text) {
    if (!this.active) return { modeApplied: "off", text };
    return transformText(text, this.level);
  }
}

module.exports = {
  SageMode,
};

