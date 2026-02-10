import { describe, it, expect } from "vitest";
import { shingle, shingleToArray } from "../src/shingler";

describe("shingle", () => {
  it("generates correct number of trigrams", () => {
    expect(shingle("hello", 3).size).toBe(3);
  });

  it("handles string shorter than ngram size", () => {
    expect(shingle("hi", 3).size).toBe(1);
  });

  it("handles empty string", () => {
    expect(shingle("", 3).size).toBe(0);
  });

  it("similar strings share shingles", () => {
    const s1 = shingle("hello world", 3);
    const s2 = shingle("hello world!", 3);
    let shared = 0;
    for (const h of s1) if (s2.has(h)) shared++;
    expect(shared / Math.max(s1.size, s2.size)).toBeGreaterThan(0.5);
  });

  it("very different strings share no shingles", () => {
    const s1 = shingle("abcdefghij", 3);
    const s2 = shingle("zyxwvutsrq", 3);
    let shared = 0;
    for (const h of s1) if (s2.has(h)) shared++;
    expect(shared).toBe(0);
  });
});

describe("shingleToArray", () => {
  it("converts set to Uint32Array", () => {
    const set = shingle("hello world", 3);
    const arr = shingleToArray(set);
    expect(arr).toBeInstanceOf(Uint32Array);
    expect(arr.length).toBe(set.size);
  });
});
