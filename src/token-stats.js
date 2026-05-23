const { encoding_for_model, get_encoding } = require("tiktoken");
const { transformText } = require("./style-engine");

const DEFAULT_ENCODING = "o200k_base";
const TOKENIZER_MODEL = "gpt-4o";
const LEVELS = ["lite", "full", "ultra", "master"];

function getEncoder(encodingName = DEFAULT_ENCODING) {
  if (encodingName === DEFAULT_ENCODING) {
    return encoding_for_model(TOKENIZER_MODEL);
  }
  return get_encoding(encodingName);
}

function countTokens(text, encodingName = DEFAULT_ENCODING) {
  const encoder = getEncoder(encodingName);
  try {
    return encoder.encode(text).length;
  } finally {
    encoder.free();
  }
}

function summarizePrompt(input, level, encodingName = DEFAULT_ENCODING) {
  const baseline = countTokens(input, encodingName);
  const out = transformText(input, level);
  const mode = countTokens(out.text, encodingName);
  const saved = baseline - mode;
  const savingsPct = baseline === 0 ? 0 : (saved / baseline) * 100;

  return {
    modeApplied: out.modeApplied,
    baseline,
    mode,
    saved,
    savingsPct,
    output: out.text,
  };
}

module.exports = {
  DEFAULT_ENCODING,
  LEVELS,
  countTokens,
  summarizePrompt,
};
