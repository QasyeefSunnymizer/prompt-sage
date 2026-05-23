const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { SageMode, transformText } = require("../src");

test("parses start/stop commands and persists level", () => {
  const mode = new SageMode();
  let res = mode.parseCommand("/sage master");
  assert.equal(res.type, "start");
  assert.equal(res.level, "master");

  const out = mode.respond("Your deployment is stable.");
  assert.match(out.text, /Hmmm\./);

  res = mode.parseCommand("stop sage");
  assert.equal(res.type, "stop");
  const plain = mode.respond("Your deployment is stable.");
  assert.equal(plain.text, "Your deployment is stable.");
});

test("preserves code blocks unchanged", () => {
  const input = "Config is wrong. ```js\nconst token = process.env.TOKEN;\n```";
  const out = transformText(input, "full").text;
  assert.match(out, /```js\nconst token = process\.env\.TOKEN;\n```/);
});

test("falls back to plain style for risky content", () => {
  const out = transformText("You should drop table users now.", "master");
  assert.equal(out.modeApplied, "plain-safety");
  assert.match(out.text, /drop table users/i);
});

test("rejects unknown levels", () => {
  const mode = new SageMode();
  const res = mode.parseCommand("/sage galaxy");
  assert.equal(res.type, "error");
});

test("matches sage snapshot fixtures", () => {
  const fixturePath = path.join(__dirname, "fixtures", "sage-snapshots.json");
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

  for (const fixture of fixtures) {
    if (fixture.expected) {
      for (const [level, expectedText] of Object.entries(fixture.expected)) {
        const out = transformText(fixture.input, level);
        assert.equal(out.text, expectedText, `${fixture.name}:${level}`);
      }
      continue;
    }

    if (fixture.expectedMode) {
      const out = transformText(fixture.input, "master");
      assert.equal(out.modeApplied, fixture.expectedMode, fixture.name);
    }
  }
});
