const LEVELS = new Set(["lite", "full", "ultra", "master"]);

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
  return `${predicate}, ${subject} ${verb}. Hmmm.`;
}

function compactSentence(s, level) {
  if (level === "lite") return s;
  let out = s
    .replace(/\b(do not|don't)\b/gi, "avoid")
    .replace(/\bbecause\b/gi, "for")
    .replace(/\btherefore\b/gi, "thus");

  if (level === "ultra" || level === "master") {
    out = out
      .replace(/\bconfiguration\b/gi, "config")
      .replace(/\bdatabase\b/gi, "DB")
      .replace(/\brequest\b/gi, "req")
      .replace(/\bresponse\b/gi, "res")
      .replace(/\bfunction\b/gi, "fn")
      .replace(/\bimplementation\b/gi, "impl");
  }
  return out;
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
  if (shouldFallbackPlain(text)) {
    return {
      modeApplied: "plain-safety",
      text: stripNoise(text),
    };
  }

  const transformed = preserveCodeBlocks(text, (chunk) => {
    const plain = stripNoise(chunk);
    const pieces = sentenceSplit(plain).map((sentence) => {
      const compact = compactSentence(sentence, safeLevel);
      return sageInvert(compact, safeLevel);
    });
    return pieces.join(" ");
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
