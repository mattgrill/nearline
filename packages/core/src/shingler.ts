import { fnv1aString } from "./fnv1a";

/**
 * Generate a set of n-gram hashes from a string.
 * Uses FNV-1a directly on character windows — no substring allocation.
 */
export function shingle(str: string, ngramSize: number): Set<number> {
  const hashes = new Set<number>();
  const len = str.length;

  if (len < ngramSize) {
    if (len > 0) {
      hashes.add(fnv1aString(str, 0, len));
    }
    return hashes;
  }

  const count = len - ngramSize + 1;
  for (let i = 0; i < count; i++) {
    hashes.add(fnv1aString(str, i, ngramSize));
  }
  return hashes;
}

/**
 * Convert a shingle set to a Uint32Array for MinHash processing.
 */
export function shingleToArray(shingles: Set<number>): Uint32Array {
  const arr = new Uint32Array(shingles.size);
  let idx = 0;
  for (const h of shingles) {
    arr[idx++] = h;
  }
  return arr;
}
