import { describe, it, expect } from "vitest";
import { findCandidates, decodePair } from "../src/lsh";
import { generateHashCoefficients, computeAllSignatures } from "../src/minhash";

describe("findCandidates", () => {
  it("finds candidates for identical strings", () => {
    const strings = ["hello world", "hello world", "completely different"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, null);
    const candidates = findCandidates(sigs, 3, 128, 32, 4);

    let foundPair = false;
    for (const pair of candidates) {
      const [a, b] = decodePair(pair, 3);
      if (a === 0 && b === 1) foundPair = true;
    }
    expect(foundPair).toBe(true);
  });

  it("does not pair very different strings", () => {
    const strings = ["abcdefghijklmnop", "zyxwvutsrqponmlk"];
    const { hashA, hashB } = generateHashCoefficients(128, 42);
    const sigs = computeAllSignatures(strings, 3, 128, hashA, hashB, null);
    expect(findCandidates(sigs, 2, 128, 32, 4).size).toBe(0);
  });
});

describe("decodePair", () => {
  it("correctly decodes pairs", () => {
    const [a, b] = decodePair(5 * 100 + 10, 100);
    expect(a).toBe(5);
    expect(b).toBe(10);
  });
});
