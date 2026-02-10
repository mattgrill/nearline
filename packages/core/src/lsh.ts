import { fnv1aUint32 } from "./fnv1a";

function encodePair(a: number, b: number, n: number): number {
  return a * n + b;
}

/**
 * Perform LSH banding to find candidate duplicate pairs.
 */
export function findCandidates(
  signatures: Uint32Array,
  count: number,
  numPermutations: number,
  numBands: number,
  bandSize: number
): Set<number> {
  const candidates = new Set<number>();

  for (let band = 0; band < numBands; band++) {
    const bandOffset = band * bandSize;
    const buckets = new Map<number, number[]>();

    for (let i = 0; i < count; i++) {
      const sigOffset = i * numPermutations + bandOffset;
      const bucketKey = fnv1aUint32(signatures, sigOffset, bandSize);

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = [];
        buckets.set(bucketKey, bucket);
      }
      bucket.push(i);
    }

    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          candidates.add(encodePair(bucket[i], bucket[j], count));
        }
      }
    }
  }

  return candidates;
}

/**
 * Decode an encoded pair value back to two indices.
 */
export function decodePair(pair: number, count: number): [number, number] {
  const a = (pair / count) | 0;
  const b = pair % count;
  return [a, b];
}
