const { transformText } = require("../src");
const samples = require("./sage-samples");

const levels = ["lite", "full", "ultra", "master"];

for (const text of samples) {
  console.log("INPUT:", text);
  for (const level of levels) {
    const out = transformText(text, level);
    console.log(`- ${level}:`, out.text);
  }
  console.log("");
}
