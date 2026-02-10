#!/usr/bin/env npx tsx

/**
 * Benchmark runner for nearline.
 * Tests findDuplicates at various dataset sizes (single-threaded).
 * Also runs a naive O(n^2) comparison at smaller sizes for contrast.
 * Outputs JSON results to scripts/benchmark-results.json.
 *
 * Prerequisites: yarn build (must have compiled dist/ first)
 * Usage: npx tsx scripts/run-benchmarks.mts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { findDuplicates } from "../packages/server/src/index";

const rootDir = new URL("..", import.meta.url).pathname;

function generateStrings(count: number): string[] {
  const strings: string[] = [];
  const chars = "abcdefghijklmnopqrstuvwxyz ";

  for (let i = 0; i < count; i++) {
    if (i % 50 < 3) {
      // ~6% near-duplicates: 3 variants per group every 50 strings
      const base =
        "this is a repeated string that appears several times in the dataset variant " +
        (i % 3);
      strings.push(base);
    } else {
      // Random unique strings (~50 chars)
      let s = "";
      let seed = i * 17 + 3;
      for (let j = 0; j < 50; j++) {
        seed = (seed * 31 + 7) & 0x7fffffff;
        s += chars[seed % chars.length];
      }
      strings.push(s);
    }
  }
  return strings;
}

/** Naive O(n^2) pairwise Jaccard comparison using character trigrams */
function naiveFindDuplicates(
  strings: string[],
  threshold: number
): { pairs: number; timeMs: number } {
  const start = performance.now();
  const n = strings.length;
  let pairCount = 0;

  // Pre-compute trigram sets
  const trigramSets: Set<string>[] = [];
  for (const s of strings) {
    const set = new Set<string>();
    for (let i = 0; i <= s.length - 3; i++) {
      set.add(s.slice(i, i + 3));
    }
    trigramSets.push(set);
  }

  // Pairwise comparison
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = trigramSets[i];
      const b = trigramSets[j];
      let intersection = 0;
      for (const t of a) {
        if (b.has(t)) intersection++;
      }
      const union = a.size + b.size - intersection;
      if (union > 0 && intersection / union >= threshold) {
        pairCount++;
      }
    }
  }

  return { pairs: pairCount, timeMs: performance.now() - start };
}

interface BenchmarkEntry {
  size: number;
  nearlineMs: number;
  naiveMs: number | null;
  candidates: number;
  duplicates: number;
  groups: number;
  speedup: string | null;
}

const sizes = [100, 500, 1_000, 5_000, 10_000, 30_000, 60_000];
const naiveMaxSize = 5_000; // Only run naive for sizes up to this
const results: BenchmarkEntry[] = [];

console.log("nearline benchmark suite");
console.log("========================\n");

console.log("Generating test datasets...");
const datasets: Record<number, string[]> = {};
for (const size of sizes) {
  datasets[size] = generateStrings(size);
}
console.log("Done.\n");

// Warmup
console.log("Warming up...");
await findDuplicates(datasets[100], { threshold: 0.8, workers: 0 });
console.log("Done.\n");

for (const size of sizes) {
  const strings = datasets[size];

  // --- nearline (MinHash + LSH) ---
  const iterations = size <= 1_000 ? 5 : size <= 10_000 ? 3 : 2;
  const label = `${size.toLocaleString().padStart(6)} strings`;
  process.stdout.write(`  nearline  ${label}...`);

  const times: number[] = [];
  let lastStats = { candidateCount: 0, duplicateCount: 0, groupCount: 0 };

  for (let i = 0; i < iterations; i++) {
    const result = await findDuplicates(strings, {
      threshold: 0.8,
      workers: 0,
    });
    times.push(result.stats.totalTimeMs);
    lastStats = result.stats;
  }

  const sorted = [...times].sort((a, b) => a - b);
  const nearlineMs = Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100;
  console.log(` ${nearlineMs.toFixed(1)}ms (median, ${iterations} runs)`);

  // --- Naive O(n^2) ---
  let naiveMs: number | null = null;
  if (size <= naiveMaxSize) {
    process.stdout.write(`  naive     ${label}...`);
    const naiveResult = naiveFindDuplicates(strings, 0.8);
    naiveMs = Math.round(naiveResult.timeMs * 100) / 100;
    console.log(` ${naiveMs.toFixed(1)}ms`);
  }

  const speedup = naiveMs !== null ? `${(naiveMs / nearlineMs).toFixed(1)}x` : null;

  results.push({
    size,
    nearlineMs,
    naiveMs,
    candidates: lastStats.candidateCount,
    duplicates: lastStats.duplicateCount,
    groups: lastStats.groupCount,
    speedup,
  });
}

// Extrapolate naive times for larger sizes using measured scaling
console.log("\n--- Results summary ---\n");
console.log("  Strings   │ nearline (ms) │ naive (ms)   │ speedup");
console.log("  ──────────┼───────────────┼──────────────┼────────");
for (const r of results) {
  const sizeStr = r.size.toLocaleString().padStart(8);
  const nlStr = r.nearlineMs.toFixed(1).padStart(11);
  const naiveStr = r.naiveMs !== null ? r.naiveMs.toFixed(1).padStart(10) : "        n/a";
  const speedStr = r.speedup ?? "n/a";
  console.log(`  ${sizeStr}  │ ${nlStr}   │ ${naiveStr}   │ ${speedStr}`);
}

// Write results
const outputPath = join(rootDir, "scripts", "benchmark-results.json");
writeFileSync(outputPath, JSON.stringify(results, null, 2) + "\n");
console.log(`\nResults written to ${outputPath}`);
