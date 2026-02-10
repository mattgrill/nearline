// Types
export type {
  DuplicateFinderOptions,
  DuplicatePair,
  DuplicateGroup,
  FindDuplicatesResult,
  FindDuplicatesStats,
  ResolvedOptions,
} from "./types";

// Pipeline (used by client/server packages)
export {
  resolveOptions,
  executePipeline,
  querySignatures,
  type ParallelComputeFn,
} from "./pipeline";

// Core algorithms (used by workers and directly)
export {
  generateHashCoefficients,
  computeAllSignatures,
  computeSignature,
  estimateSimilarity,
} from "./minhash";

export { fnv1aString, fnv1aUint32 } from "./fnv1a";
export { shingle, shingleToArray } from "./shingler";
export { findCandidates, decodePair } from "./lsh";
export { UnionFind } from "./union-find";
