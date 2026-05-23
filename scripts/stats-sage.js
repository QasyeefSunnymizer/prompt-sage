const samples = require("./sage-samples");
const { DEFAULT_ENCODING, LEVELS, summarizePrompt } = require("../src/token-stats");

function pct(value) {
  return `${value.toFixed(1)}%`;
}

function printRow(columns, widths) {
  const row = columns.map((value, i) => String(value).padEnd(widths[i])).join("  ");
  console.log(row);
}

function run(encodingName = process.env.SAGE_STATS_ENCODING || DEFAULT_ENCODING) {
  console.log(`sage Internal Token Stats (encoding=${encodingName})`);
  console.log("");

  const header = ["sample", "level", "baseline", "mode", "saved", "%"];
  const rows = [];
  const perModeTotals = new Map(LEVELS.map((level) => [level, { baseline: 0, mode: 0, saved: 0, pcts: [] }]));
  const overall = { baseline: 0, mode: 0, saved: 0 };

  samples.forEach((sample, sampleIndex) => {
    LEVELS.forEach((level) => {
      const stats = summarizePrompt(sample, level, encodingName);
      const savedFlag = stats.modeApplied === "plain-safety" ? " (safety fallback)" : "";
      rows.push([
        `#${sampleIndex + 1}`,
        `${level}${savedFlag}`,
        stats.baseline,
        stats.mode,
        stats.saved,
        pct(stats.savingsPct),
      ]);

      const modeTotals = perModeTotals.get(level);
      modeTotals.baseline += stats.baseline;
      modeTotals.mode += stats.mode;
      modeTotals.saved += stats.saved;
      modeTotals.pcts.push(stats.savingsPct);
      overall.baseline += stats.baseline;
      overall.mode += stats.mode;
      overall.saved += stats.saved;
    });
  });

  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  printRow(header, widths);
  printRow(widths.map((w) => "-".repeat(w)), widths);
  rows.forEach((row) => printRow(row, widths));

  console.log("");
  const overallPct = overall.baseline === 0 ? 0 : (overall.saved / overall.baseline) * 100;
  console.log(
    `Overall totals: baseline=${overall.baseline} mode=${overall.mode} saved=${overall.saved} savings=${pct(overallPct)}`
  );
  console.log("");
  console.log("Summary by mode");
  console.log("mode  baseline  mode  saved  avg%  min%  max%");

  for (const level of LEVELS) {
    const totals = perModeTotals.get(level);
    const avg = totals.pcts.reduce((a, b) => a + b, 0) / totals.pcts.length;
    const min = Math.min(...totals.pcts);
    const max = Math.max(...totals.pcts);
    console.log(
      `${level}  ${totals.baseline}  ${totals.mode}  ${totals.saved}  ${pct(avg)}  ${pct(min)}  ${pct(max)}`
    );
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  run,
};
