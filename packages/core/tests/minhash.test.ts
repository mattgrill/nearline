import { describe, it, expect } from "vitest";
import {
  generateHashCoefficients,
  computeAllSignatures,
  estimateSimilarity,
} from "../src/minhash";

describe("generateHashCoefficients", () => {
  it("generates arrays of correct size", () => {
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    expect(hashA.length).toBe(128);
    expect(hashB.length).toBe(128);
  });

  it("is deterministic with same seed", () => {
    const c1 = generateHashCoefficients(128, 42);
    const c2 = generateHashCoefficients(128, 42);
    expect(Array.from(c1.hashA)).toEqual(Array.from(c2.hashA));
  });

  it("differs with different seeds", () => {
    const c1 = generateHashCoefficients(128, 42);
    const c2 = generateHashCoefficients(128, 99);
    expect(Array.from(c1.hashA)).not.toEqual(Array.from(c2.hashA));
  });
});

describe("estimateSimilarity", () => {
  it("returns 1.0 for identical strings", () => {
    const strings = ["hello world", "hello world"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, null);
    expect(estimateSimilarity(sigs, 0, 1, 128)).toBe(1);
  });

  it("returns high similarity for near-duplicates", () => {
    const strings = ["the quick brown fox jumps", "the quick brown fox jump"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, null);
    expect(estimateSimilarity(sigs, 0, 1, 128)).toBeGreaterThan(0.7);
  });

  it("returns low similarity for different strings", () => {
    const strings = ["the quick brown fox", "completely unrelated text here"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, null);
    expect(estimateSimilarity(sigs, 0, 1, 128)).toBeLessThan(0.3);
  });

  it("applies preprocessing", () => {
    const strings = ["HELLO", "hello"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, (s) => s.toLowerCase());
    expect(estimateSimilarity(sigs, 0, 1, 128)).toBe(1);
  });
});
