import type {
  DuplicateFinderOptions,
  DuplicatePair,
  DuplicateGroup,
  FindDuplicatesResult,
  ResolvedOptions,
} from "./types";
import {
  generateHashCoefficients,
  computeAllSignatures,
  estimateSimilarity,
  computeSignature,
} from "./minhash";
import { findCandidates, decodePair } from "./lsh";
import { UnionFind } from "./union-find";
import { shingle, shingleToArray } from "./shingler";

/**
 * Resolve user options into fully-specified options.
 * Platform-specific code should set `workers` before calling this.
 */
export function resolveOptions(
  opts: DuplicateFinderOptions | undefined,
  defaultWorkers: number
): ResolvedOptions {
  let workers: number;
  if (opts?.workers === undefined || opts?.workers === "auto") {
    workers = defaultWorkers;
  } else {
    workers = opts.workers;
  }

  return {
    threshold: opts?.threshold ?? 0.8,
    ngramSize: opts?.ngramSize ?? 3,
    numPermutations: opts?.numPermutations ?? 128,
    numBands: opts?.numBands ?? 32,
    bandSize: opts?.bandSize ?? 4,
    workers,
    batchSize: opts?.batchSize ?? 1000,
    preprocess: opts?.preprocess ?? null,
    seed: opts?.seed ?? 42,
  };
}

/** Signature for a parallel compute function provided by client/server */
export type ParallelComputeFn = (
  strings: string[],
  ngramSize: number,
  numPermutations: number,
  hashA: Uint32Array,
  hashB: Uint32Array,
  numWorkers: number,
  batchSize: number
) => Promise<Uint32Array>;

const WORKER_THRESHOLD = 5000;

/**
 * Core pipeline: compute signatures, LSH, verify, group.
 * Used by both client and server packages.
 */
export async function executePipeline(
  strings: string[],
  options: ResolvedOptions,
  parallelCompute: ParallelComputeFn | null
): Promise<FindDuplicatesResult> {
  const startTime = performance.now();
  const n = strings.length;

  if (n < 2) {
    return {
      pairs: [],
      groups: [],
      stats: {
        totalTimeMs: performance.now() - startTime,
        inputCount: n,
        candidateCount: 0,
        duplicateCount: 0,
        groupCount: 0,
      },
    };
  }

  const { hashA, hashB } = generateHashCoefficients(
    options.numPermutations,
    options.seed
  );

  // Compute signatures
  let signatures: Uint32Array;
  const useWorkers = parallelCompute && options.workers > 0 && n >= WORKER_THRESHOLD;

  if (useWorkers) {
    signatures = await parallelCompute(
      strings,
      options.ngramSize,
      options.numPermutations,
      hashA,
      hashB,
      options.workers,
      options.batchSize
    );
  } else {
    signatures = computeAllSignatures(
      strings,
      options.ngramSize,
      options.numPermutations,
      hashA,
      hashB,
      options.preprocess
    );
  }

  // LSH candidate generation
  const candidateSet = findCandidates(
    signatures,
    n,
    options.numPermutations,
    options.numBands,
    options.bandSize
  );

  // Verify candidates
  const pairs: DuplicatePair[] = [];
  const uf = new UnionFind(n);
  const involvedIndices = new Set<number>();

  for (const pair of candidateSet) {
    const [a, b] = decodePair(pair, n);
    const sim = estimateSimilarity(signatures, a, b, options.numPermutations);
    if (sim >= options.threshold) {
      pairs.push({ indexA: a, indexB: b, similarity: sim });
      uf.union(a, b);
      involvedIndices.add(a);
      involvedIndices.add(b);
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);

  const groupArrays = uf.getGroups(involvedIndices);
  const groups: DuplicateGroup[] = groupArrays.map((indices) => ({ indices }));

  return {
    pairs,
    groups,
    stats: {
      totalTimeMs: performance.now() - startTime,
      inputCount: n,
      candidateCount: candidateSet.size,
      duplicateCount: pairs.length,
      groupCount: groups.length,
    },
  };
}

/**
 * Build a query function against pre-computed signatures.
 * Used by both DuplicateFinder class implementations.
 */
export function querySignatures(
  queryStr: string,
  options: ResolvedOptions,
  signatures: Uint32Array,
  hashA: Uint32Array,
  hashB: Uint32Array,
  corpusSize: number
): DuplicatePair[] {
  let processed = queryStr;
  if (options.preprocess) {
    processed = options.preprocess(processed);
  }

  const shingles = shingleToArray(shingle(processed, options.ngramSize));
  const querySig = new Uint32Array(options.numPermutations);
  computeSignature(shingles, hashA, hashB, options.numPermutations, querySig, 0);

  const matches: DuplicatePair[] = [];

  for (let i = 0; i < corpusSize; i++) {
    const offset = i * options.numPermutations;
    let matchCount = 0;
    for (let p = 0; p < options.numPermutations; p++) {
      if (querySig[p] === signatures[offset + p]) {
        matchCount++;
      }
    }
    const sim = matchCount / options.numPermutations;
    if (sim >= options.threshold) {
      matches.push({ indexA: -1, indexB: i, similarity: sim });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}
