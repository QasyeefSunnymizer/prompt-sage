const LEVELS = new Set(["lite", "full", "ultra", "master", "roleplay"]);

const FILLER = /\b(just|really|basically|actually|simply|very|maybe|perhaps)\b/gi;
const PLEASANTRY = /\b(sure|certainly|of course|happy to|glad to)\b/gi;
const HEDGING = /\b(i think|it seems|likely|probably)\b/gi;

const RISKY = /\b(delete|drop table|truncate|rm -rf|destroy|irreversible|cannot be undone|wipe)\b/i;
const SECURITY = /\b(security|credential|secret|token leak|exploit|vulnerability)\b/i;

function stripNoise(text) {
  return text
    .replace(FILLER, "")
    .replace(PLEASANTRY, "")
    .replace(HEDGING, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceSplit(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitPunctuation(sentence) {
  const m = sentence.match(/^([\s\S]*?)([.!?])?$/);
  return { core: (m && m[1]) || sentence, punct: (m && m[2]) || "." };
}

function compactWords(text, level) {
  if (level !== "ultra" && level !== "master" && level !== "roleplay") return text;
  return text
    .replace(/\bconfiguration\b/gi, "config")
    .replace(/\bdatabase\b/gi, "DB")
    .replace(/\brequest\b/gi, "req")
    .replace(/\bresponse\b/gi, "res")
    .replace(/\bfunction\b/gi, "fn")
    .replace(/\bimplementation\b/gi, "impl");
}

function yodaPivot(sentence) {
  const { core, punct } = splitPunctuation(sentence);

  const because = core.match(/^(.+?)\s+because\s+(.+)$/i);
  if (because) return `${because[2]}, ${because[1]} for${punct}`;

  const when = core.match(/^(.+?)\s+when\s+(.+)$/i);
  if (when) return `when ${when[2]}, ${when[1]}${punct}`;

  const ifClause = core.match(/^(.+?)\s+if\s+(.+)$/i);
  if (ifClause) return `if ${ifClause[2]}, ${ifClause[1]}${punct}`;

  return null;
}

function sageInvert(sentence, level) {
  const m = sentence.match(/^(.+?)\s+(is|are|was|were|will|can|should|must)\s+(.+?)([.!?])?$/i);
  if (!m) return sentence;

  const subject = m[1];
  const verb = m[2];
  const predicate = m[3];
  const punct = m[4] || ".";

  if (level === "lite") return sentence;
  if (level === "full") return `${predicate}, ${subject} ${verb}${punct}`;
  if (level === "ultra") return `${predicate}, ${subject} ${verb}${punct}`;
  if (level === "roleplay") return `${predicate}, ${subject} ${verb}${punct}`;
  return `${predicate}, ${subject} ${verb}${punct} Hmm.`;
}

function transformSentence(sentence, level) {
  if (level === "lite") return sentence;

  const compact = compactSentence(sentence, level);
  const pivoted = yodaPivot(compact);
  const inverted = sageInvert(pivoted || compact, level);

  if (level === "roleplay") {
    const { core } = splitPunctuation(inverted);
    return `${core}. Hmm.`;
  }
  return inverted;
}

function enforceLengthBudget(input, output, level) {
  if (level === "lite" || output.length <= input.length) return output;
  const maxFactor = level === "full" ? 1.08 : 1.05;
  if (output.length <= Math.ceil(input.length * maxFactor)) return output;
  return input;
}

function compactSentence(s, level) {
  if (level === "lite") return s;
  let out = s
    .replace(/\b(do not|don't)\b/gi, "avoid")
    .replace(/\bbecause\b/gi, "for")
    .replace(/\btherefore\b/gi, "thus");

  return compactWords(out, level);
}

function preserveCodeBlocks(text, fn) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => (part.startsWith("```") ? part : fn(part)))
    .join("");
}

function shouldFallbackPlain(text) {
  return RISKY.test(text) || SECURITY.test(text);
}

function transformText(text, level = "full") {
  const safeLevel = LEVELS.has(level) ? level : "full";
  const effectiveLevel = safeLevel === "master" ? "roleplay" : safeLevel;
  if (shouldFallbackPlain(text)) {
    return {
      modeApplied: "plain-safety",
      text: stripNoise(text),
    };
  }

  const transformed = preserveCodeBlocks(text, (chunk) => {
    const plain = stripNoise(chunk);
    const pieces = sentenceSplit(plain).map((sentence) => {
      return transformSentence(sentence, effectiveLevel);
    });
    return enforceLengthBudget(plain, pieces.join(" "), effectiveLevel);
  });

  return {
    modeApplied: safeLevel,
    text: transformed,
  };
}

module.exports = {
  LEVELS,
  transformText,
  shouldFallbackPlain,
};
