import { encoding_for_model, get_encoding } from "tiktoken";
import { transformText, TransformResult } from "./style-engine.ts";

export const DEFAULT_ENCODING = "o200k_base";
export const TOKENIZER_MODEL = "gpt-4o";
export const LEVELS = ["lite", "full", "ultra", "master", "roleplay"];

function getEncoder(encodingName: string = DEFAULT_ENCODING) {
  if (encodingName === DEFAULT_ENCODING) {
    return encoding_for_model(TOKENIZER_MODEL);
  }
  return get_encoding(encodingName);
}

export function countTokens(text: string, encodingName: string = DEFAULT_ENCODING): number {
  const encoder = getEncoder(encodingName);
  try {
    return encoder.encode(text).length;
  } finally {
    encoder.free();
  }
}

export interface SummarizeResult {
  modeApplied: string;
  baseline: number;
  mode: number;
  saved: number;
  savingsPct: number;
  output: string;
}

export function summarizePrompt(
  input: string,
  level: string,
  encodingName: string = DEFAULT_ENCODING
): SummarizeResult {
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
