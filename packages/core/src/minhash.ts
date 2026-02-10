import { fnv1aString } from "./fnv1a";

function xorshift32(state: number): number {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

/**
 * Generate hash salts for MinHash permutations.
 */
export function generateHashCoefficients(
  numPermutations: number,
  seed: number
): { hashA: Uint32Array; hashB: Uint32Array } {
  const hashA = new Uint32Array(numPermutations);
  const hashB = new Uint32Array(numPermutations);
  let state = seed === 0 ? 1 : seed;

  for (let i = 0; i < numPermutations; i++) {
    state = xorshift32(state);
    hashA[i] = state;
    state = xorshift32(state);
    hashB[i] = state;
  }

  return { hashA, hashB };
}

/**
 * Fast hash permutation using multiply-xorshift mixing.
 */
function permutedHash(val: number, a: number, b: number): number {
  let h = val;
  h = Math.imul(h ^ a, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ b ^ (h >>> 16)) >>> 0;
  return h;
}

/**
 * Compute MinHash signature for a shingle set (Uint32Array of hashes).
 * Writes into the `signatures` buffer at the given offset.
 */
export function computeSignature(
  shingles: Uint32Array,
  hashA: Uint32Array,
  hashB: Uint32Array,
  numPermutations: number,
  signatures: Uint32Array,
  sigOffset: number
): void {
  for (let p = 0; p < numPermutations; p++) {
    signatures[sigOffset + p] = 0xffffffff;
  }

  const shingleCount = shingles.length;
  if (shingleCount === 0) return;

  for (let s = 0; s < shingleCount; s++) {
    const val = shingles[s];
    for (let p = 0; p < numPermutations; p++) {
      const h = permutedHash(val, hashA[p], hashB[p]);
      if (h < signatures[sigOffset + p]) {
        signatures[sigOffset + p] = h;
      }
    }
  }
}

/**
 * Compute MinHash signatures for all strings.
 * Processes trigrams inline — no intermediate Set/Array allocation.
 */
export function computeAllSignatures(
  strings: string[],
  ngramSize: number,
  numPermutations: number,
  hashA: Uint32Array,
  hashB: Uint32Array,
  preprocess: ((s: string) => string) | null
): Uint32Array {
  const n = strings.length;
  const signatures = new Uint32Array(n * numPermutations);

  for (let i = 0; i < n; i++) {
    const str = preprocess ? preprocess(strings[i]) : strings[i];
    computeSignatureFromString(
      str, ngramSize, hashA, hashB, numPermutations, signatures, i * numPermutations
    );
  }

  return signatures;
}

function computeSignatureFromString(
  str: string,
  ngramSize: number,
  hashA: Uint32Array,
  hashB: Uint32Array,
  numPermutations: number,
  signatures: Uint32Array,
  sigOffset: number
): void {
  for (let p = 0; p < numPermutations; p++) {
    signatures[sigOffset + p] = 0xffffffff;
  }

  const len = str.length;
  if (len === 0) return;

  if (len < ngramSize) {
    const val = fnv1aString(str, 0, len);
    for (let p = 0; p < numPermutations; p++) {
      signatures[sigOffset + p] = permutedHash(val, hashA[p], hashB[p]);
    }
    return;
  }

  const count = len - ngramSize + 1;
  for (let i = 0; i < count; i++) {
    const val = fnv1aString(str, i, ngramSize);
    for (let p = 0; p < numPermutations; p++) {
      const h = permutedHash(val, hashA[p], hashB[p]);
      if (h < signatures[sigOffset + p]) {
        signatures[sigOffset + p] = h;
      }
    }
  }
}

/**
 * Estimate Jaccard similarity between two strings from their MinHash signatures.
 */
export function estimateSimilarity(
  signatures: Uint32Array,
  indexA: number,
  indexB: number,
  numPermutations: number
): number {
  const offsetA = indexA * numPermutations;
  const offsetB = indexB * numPermutations;
  let matches = 0;

  for (let p = 0; p < numPermutations; p++) {
    if (signatures[offsetA + p] === signatures[offsetB + p]) {
      matches++;
    }
  }

  return matches / numPermutations;
}
