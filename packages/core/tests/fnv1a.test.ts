import { describe, it, expect } from "vitest";
import { fnv1aString, fnv1aUint32 } from "../src/fnv1a";

describe("fnv1aString", () => {
  it("produces consistent hashes", () => {
    expect(fnv1aString("hello")).toBe(fnv1aString("hello"));
  });

  it("produces different hashes for different inputs", () => {
    expect(fnv1aString("hello")).not.toBe(fnv1aString("world"));
  });

  it("returns unsigned 32-bit integer", () => {
    const h = fnv1aString("test");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("works with offset and length", () => {
    expect(fnv1aString("hello", 0, 5)).toBe(fnv1aString("xxhelloxx", 2, 5));
  });

  it("handles empty string", () => {
    expect(fnv1aString("", 0, 0)).toBe(0x811c9dc5);
  });
});

describe("fnv1aUint32", () => {
  it("produces consistent hashes", () => {
    const arr = new Uint32Array([1, 2, 3, 4]);
    expect(fnv1aUint32(arr, 0, 4)).toBe(fnv1aUint32(arr, 0, 4));
  });

  it("produces different hashes for different data", () => {
    const a = new Uint32Array([1, 2, 3, 4]);
    const b = new Uint32Array([5, 6, 7, 8]);
    expect(fnv1aUint32(a, 0, 4)).not.toBe(fnv1aUint32(b, 0, 4));
  });

  it("respects offset and length", () => {
    const arr = new Uint32Array([0, 1, 2, 3, 0]);
    const sub = new Uint32Array([1, 2, 3]);
    expect(fnv1aUint32(arr, 1, 3)).toBe(fnv1aUint32(sub, 0, 3));
  });
});
