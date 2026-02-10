#!/usr/bin/env node

/**
 * Generate an SVG performance chart from benchmark results.
 * Reads scripts/benchmark-results.json → assets/benchmark.svg
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const results = JSON.parse(
  readFileSync(join(rootDir, "scripts", "benchmark-results.json"), "utf-8")
);

// Chart dimensions
const W = 780;
const H = 420;
const PAD = { top: 52, right: 36, bottom: 70, left: 76 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

// Data
const nearlinePoints = results.map((r) => ({ x: r.size, y: r.nearlineMs }));
const naivePoints = results
  .filter((r) => r.naiveMs !== null)
  .map((r) => ({ x: r.size, y: r.naiveMs }));

// Extrapolate naive O(n^2) for larger sizes using last measured point
const lastNaive = naivePoints[naivePoints.length - 1];
const naiveExtrapolated = results
  .filter((r) => r.size > lastNaive.x)
  .map((r) => ({
    x: r.size,
    y: lastNaive.y * (r.size / lastNaive.x) ** 2,
  }));

const allTimes = [
  ...nearlinePoints.map((p) => p.y),
  ...naivePoints.map((p) => p.y),
  ...naiveExtrapolated.map((p) => p.y),
];

// Log-log scale
const minX = Math.min(...nearlinePoints.map((p) => p.x));
const maxX = Math.max(...nearlinePoints.map((p) => p.x));
const minY = Math.min(...allTimes) * 0.5;
const maxY = Math.max(...allTimes) * 2;

const logMinX = Math.log10(minX);
const logMaxX = Math.log10(maxX);
const logMinY = Math.log10(minY);
const logMaxY = Math.log10(maxY);

function sx(v) {
  return PAD.left + ((Math.log10(v) - logMinX) / (logMaxX - logMinX)) * plotW;
}
function sy(v) {
  return (
    PAD.top +
    plotH -
    ((Math.log10(v) - logMinY) / (logMaxY - logMinY)) * plotH
  );
}

// Format time
function fmtTime(ms) {
  if (ms >= 60000) return `${(ms / 60000).toFixed(0)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms >= 1) return `${ms.toFixed(0)}ms`;
  return `${(ms * 1000).toFixed(0)}µs`;
}
function fmtSize(n) {
  if (n >= 1000) return `${n / 1000}k`;
  return `${n}`;
}

const svg = [];
const push = (s) => svg.push(s);

push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
);

// Defs for gradients
push(`<defs>`);
push(
  `<linearGradient id="nearlineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#58a6ff" stop-opacity="0.15"/><stop offset="100%" stop-color="#58a6ff" stop-opacity="0.02"/></linearGradient>`
);
push(`</defs>`);

// Background
push(`<rect width="${W}" height="${H}" fill="#0d1117" rx="10"/>`);

// Title
push(
  `<text x="${W / 2}" y="30" text-anchor="middle" fill="#e6edf3" font-size="15" font-weight="600">nearline — Performance vs Naive O(n²)</text>`
);
push(
  `<text x="${W / 2}" y="46" text-anchor="middle" fill="#8b949e" font-size="10.5">Log-log scale · Single-threaded · Node.js ${process.version}</text>`
);

// Grid
const yTicks = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000].filter(
  (v) => v >= minY && v <= maxY
);
for (const t of yTicks) {
  const y = sy(t);
  push(
    `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}" stroke="#21262d" stroke-width="0.75"/>`
  );
  push(
    `<text x="${PAD.left - 8}" y="${y + 3.5}" text-anchor="end" fill="#8b949e" font-size="10">${fmtTime(t)}</text>`
  );
}

const xTicks = [100, 500, 1000, 5000, 10000, 30000, 60000].filter(
  (v) => v >= minX && v <= maxX
);
for (const t of xTicks) {
  const x = sx(t);
  push(
    `<line x1="${x}" y1="${PAD.top}" x2="${x}" y2="${PAD.top + plotH}" stroke="#21262d" stroke-width="0.75"/>`
  );
  push(
    `<line x1="${x}" y1="${PAD.top + plotH}" x2="${x}" y2="${PAD.top + plotH + 5}" stroke="#8b949e" stroke-width="0.75"/>`
  );
  push(
    `<text x="${x}" y="${PAD.top + plotH + 18}" text-anchor="middle" fill="#8b949e" font-size="10">${fmtSize(t)}</text>`
  );
}

// Axis borders
push(
  `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}" stroke="#30363d" stroke-width="1.5"/>`
);
push(
  `<line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}" stroke="#30363d" stroke-width="1.5"/>`
);

// Axis labels
push(
  `<text x="${W / 2}" y="${H - 14}" text-anchor="middle" fill="#8b949e" font-size="11">Number of input strings</text>`
);
push(
  `<text x="16" y="${PAD.top + plotH / 2}" text-anchor="middle" fill="#8b949e" font-size="11" transform="rotate(-90, 16, ${PAD.top + plotH / 2})">Processing time</text>`
);

// Helper: path from points
function makePath(points) {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`
    )
    .join(" ");
}

// Area fill under nearline curve
const areaPath =
  makePath(nearlinePoints) +
  ` L ${sx(nearlinePoints[nearlinePoints.length - 1].x).toFixed(1)} ${(PAD.top + plotH).toFixed(1)}` +
  ` L ${sx(nearlinePoints[0].x).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`;
push(`<path d="${areaPath}" fill="url(#nearlineFill)"/>`);

// Naive measured (solid red)
push(
  `<path d="${makePath(naivePoints)}" fill="none" stroke="#f85149" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
);

// Naive extrapolated (dashed red)
if (naiveExtrapolated.length > 0) {
  const extPath = makePath([lastNaive, ...naiveExtrapolated]);
  push(
    `<path d="${extPath}" fill="none" stroke="#f85149" stroke-width="2" stroke-dasharray="8 5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`
  );
}

// Nearline (solid blue)
push(
  `<path d="${makePath(nearlinePoints)}" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
);

// Dots
for (const p of naivePoints) {
  push(
    `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="#f85149" stroke="#0d1117" stroke-width="1.5"/>`
  );
}
for (const p of nearlinePoints) {
  push(
    `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="#58a6ff" stroke="#0d1117" stroke-width="1.5"/>`
  );
}

// Data labels on key nearline points
const labelPoints = [
  { size: 1000, anchor: "start", dx: 8, dy: -8 },
  { size: 10000, anchor: "start", dx: 8, dy: -8 },
  { size: 60000, anchor: "end", dx: -8, dy: -10 },
];
for (const lp of labelPoints) {
  const r = results.find((r) => r.size === lp.size);
  if (!r) continue;
  push(
    `<text x="${(sx(r.size) + lp.dx).toFixed(1)}" y="${(sy(r.nearlineMs) + lp.dy).toFixed(1)}" text-anchor="${lp.anchor}" fill="#79c0ff" font-size="10" font-weight="500">${fmtTime(r.nearlineMs)}</text>`
  );
}

// Data labels on key naive points
for (const r of results.filter((r) => r.naiveMs && r.size >= 1000)) {
  const dx = r.size === 5000 ? -8 : 8;
  const anchor = r.size === 5000 ? "end" : "start";
  push(
    `<text x="${(sx(r.size) + dx).toFixed(1)}" y="${(sy(r.naiveMs) + 14).toFixed(1)}" text-anchor="${anchor}" fill="#ffa198" font-size="10" font-weight="500">${fmtTime(r.naiveMs)}</text>`
  );
}

// Extrapolated naive label on 60k
if (naiveExtrapolated.length > 0) {
  const last = naiveExtrapolated[naiveExtrapolated.length - 1];
  const clampedY = Math.max(PAD.top + 8, sy(last.y));
  push(
    `<text x="${(sx(last.x) - 8).toFixed(1)}" y="${(clampedY + 14).toFixed(1)}" text-anchor="end" fill="#ffa198" font-size="10" font-weight="500" opacity="0.7">~${fmtTime(last.y)} (est.)</text>`
  );
}

// Speedup annotation at 5k
const r5k = results.find((r) => r.size === 5000);
if (r5k && r5k.naiveMs) {
  const midY = (sy(r5k.nearlineMs) + sy(r5k.naiveMs)) / 2;
  push(
    `<text x="${(sx(5000) + 14).toFixed(1)}" y="${midY.toFixed(1)}" fill="#3fb950" font-size="11" font-weight="600">${r5k.speedup}</text>`
  );
  // Arrow bracket
  const x = sx(5000) + 10;
  push(
    `<line x1="${x}" y1="${sy(r5k.nearlineMs) + 6}" x2="${x}" y2="${sy(r5k.naiveMs) - 6}" stroke="#3fb950" stroke-width="1" opacity="0.5"/>`
  );
}

// Legend
const lx = PAD.left + plotW - 190;
const ly = PAD.top + 16;
push(`<rect x="${lx - 10}" y="${ly - 12}" width="200" height="70" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>`);

const legendItems = [
  { label: "nearline (MinHash + LSH)", color: "#58a6ff", dash: false },
  { label: "Naive O(n²) — measured", color: "#f85149", dash: false },
  { label: "Naive O(n²) — extrapolated", color: "#f85149", dash: true },
];
for (let i = 0; i < legendItems.length; i++) {
  const item = legendItems[i];
  const y = ly + i * 20;
  const dashAttr = item.dash ? ' stroke-dasharray="6 4" opacity="0.6"' : "";
  push(
    `<line x1="${lx}" y1="${y}" x2="${lx + 22}" y2="${y}" stroke="${item.color}" stroke-width="2.5"${dashAttr} stroke-linecap="round"/>`
  );
  if (!item.dash) {
    push(
      `<circle cx="${lx + 11}" cy="${y}" r="3" fill="${item.color}" stroke="#161b22" stroke-width="1"/>`
    );
  }
  push(
    `<text x="${lx + 30}" y="${y + 3.5}" fill="#c9d1d9" font-size="10.5">${item.label}</text>`
  );
}

push("</svg>");

// Write
const assetsDir = join(rootDir, "assets");
mkdirSync(assetsDir, { recursive: true });
const outputPath = join(assetsDir, "benchmark.svg");
writeFileSync(outputPath, svg.join("\n") + "\n");
console.log(`Chart written to ${outputPath}`);
console.log(`Dimensions: ${W}x${H}`);
