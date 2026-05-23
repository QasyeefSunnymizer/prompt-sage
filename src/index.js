const { SageMode } = require("./sage-mode");
const { transformText, LEVELS, shouldFallbackPlain } = require("./style-engine");
const { runSelfUpdate } = require("./self-update");

module.exports = {
  SageMode,
  transformText,
  LEVELS,
  shouldFallbackPlain,
  runSelfUpdate,
};
