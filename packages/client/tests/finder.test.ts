import { describe, it, expect } from "vitest";
import { findDuplicates, DuplicateFinder } from "../src/index";

describe("client findDuplicates", () => {
  it("finds exact duplicates", async () => {
    const result = await findDuplicates(
      [
        "the quick brown fox jumps over the lazy dog",
        "unrelated string",
        "the quick brown fox jumps over the lazy dog",
      ],
      { threshold: 0.8, workers: 0 }
    );

    const pair = result.pairs.find(
      (p) => (p.indexA === 0 && p.indexB === 2) || (p.indexA === 2 && p.indexB === 0)
    );
    expect(pair).toBeDefined();
    expect(pair!.similarity).toBe(1);
  });

  it("finds near-duplicates", async () => {
    const result = await findDuplicates(
      [
        "the quick brown fox jumps over the lazy dog",
        "the quick brown fox jumps over the lazy cat",
        "something entirely different",
      ],
      { threshold: 0.7, workers: 0 }
    );

    const pair = result.pairs.find(
      (p) => (p.indexA === 0 && p.indexB === 1) || (p.indexA === 1 && p.indexB === 0)
    );
    expect(pair).toBeDefined();
    expect(pair!.similarity).toBeGreaterThan(0.7);
  });

  it("handles empty input", async () => {
    const result = await findDuplicates([], { workers: 0 });
    expect(result.pairs).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it("runs single-threaded when no workerUrl provided", async () => {
    const result = await findDuplicates(
      ["hello world", "hello world!", "goodbye"],
      { threshold: 0.5 }
    );
    expect(result.stats.inputCount).toBe(3);
  });

  it("supports preprocessing", async () => {
    const result = await findDuplicates(
      ["THE QUICK BROWN FOX", "the quick brown fox", "different"],
      { threshold: 0.9, workers: 0, preprocess: (s) => s.toLowerCase() }
    );

    const pair = result.pairs.find(
      (p) => (p.indexA === 0 && p.indexB === 1) || (p.indexA === 1 && p.indexB === 0)
    );
    expect(pair).toBeDefined();
    expect(pair!.similarity).toBe(1);
  });
});

describe("client DuplicateFinder class", () => {
  it("finds duplicates via query", async () => {
    const finder = new DuplicateFinder({ threshold: 0.7, workers: 0 });
    finder.addStrings([
      "the quick brown fox jumps over the lazy dog",
      "something entirely different",
    ]);
    await finder.buildIndex();

    const matches = finder.query("the quick brown fox jumps over the lazy cat");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].indexB).toBe(0);
  });

  it("throws if querying without building index", () => {
    const finder = new DuplicateFinder({ workers: 0 });
    finder.addStrings(["hello"]);
    expect(() => finder.query("hello")).toThrow("Index not built");
  });
});
