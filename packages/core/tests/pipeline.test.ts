import { describe, it, expect } from "vitest";
import { executePipeline, resolveOptions } from "../src/pipeline";

describe("executePipeline", () => {
  it("finds exact duplicates", async () => {
    const options = resolveOptions({ threshold: 0.8, workers: 0 }, 0);
    const result = await executePipeline(
      ["the quick brown fox jumps over the lazy dog", "unrelated", "the quick brown fox jumps over the lazy dog"],
      options,
      null
    );
    const pair = result.pairs.find((p) => (p.indexA === 0 && p.indexB === 2) || (p.indexA === 2 && p.indexB === 0));
    expect(pair).toBeDefined();
    expect(pair!.similarity).toBe(1);
  });

  it("finds near-duplicates", async () => {
    const options = resolveOptions({ threshold: 0.7, workers: 0 }, 0);
    const result = await executePipeline(
      ["the quick brown fox jumps over the lazy dog", "the quick brown fox jumps over the lazy cat", "something entirely different"],
      options,
      null
    );
    const pair = result.pairs.find((p) => (p.indexA === 0 && p.indexB === 1) || (p.indexA === 1 && p.indexB === 0));
    expect(pair).toBeDefined();
    expect(pair!.similarity).toBeGreaterThan(0.7);
  });

  it("handles empty input", async () => {
    const options = resolveOptions({}, 0);
    const result = await executePipeline([], options, null);
    expect(result.pairs).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it("returns stats", async () => {
    const options = resolveOptions({ threshold: 0.5, workers: 0 }, 0);
    const result = await executePipeline(["hello world", "hello world!", "goodbye"], options, null);
    expect(result.stats.inputCount).toBe(3);
    expect(result.stats.totalTimeMs).toBeGreaterThan(0);
  });
});
