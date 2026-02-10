import { cpus } from "node:os";
import {
  type DuplicateFinderOptions,
  type DuplicatePair,
  type FindDuplicatesResult,
  type ResolvedOptions,
  resolveOptions,
  executePipeline,
  querySignatures,
  generateHashCoefficients,
  computeAllSignatures,
} from "@mattgrill/nearline-core";
import { createNodeWorkerCompute } from "./workers/pool";

/**
 * Find near-duplicate strings in a dataset (Node.js-optimized).
 * Uses worker_threads for parallel computation above 5000 strings.
 */
export async function findDuplicates(
  strings: string[],
  opts?: DuplicateFinderOptions
): Promise<FindDuplicatesResult> {
  const defaultWorkers = Math.max(1, cpus().length - 1);
  const options = resolveOptions(opts, defaultWorkers);
  const parallelCompute = createNodeWorkerCompute();
  return executePipeline(strings, options, parallelCompute);
}

/**
 * Class API for incremental use and querying against a built index (Node.js-optimized).
 */
export class DuplicateFinder {
  private options: ResolvedOptions;
  private strings: string[] = [];
  private signatures: Uint32Array | null = null;
  private hashA: Uint32Array;
  private hashB: Uint32Array;

  constructor(opts?: DuplicateFinderOptions) {
    const defaultWorkers = Math.max(1, cpus().length - 1);
    this.options = resolveOptions(opts, defaultWorkers);
    const { hashA, hashB } = generateHashCoefficients(
      this.options.numPermutations,
      this.options.seed
    );
    this.hashA = hashA;
    this.hashB = hashB;
  }

  addStrings(strings: string[]): void {
    this.strings.push(...strings);
    this.signatures = null;
  }

  async buildIndex(): Promise<void> {
    const parallelCompute = createNodeWorkerCompute();

    if (parallelCompute && this.options.workers > 0 && this.strings.length >= 5000) {
      this.signatures = await parallelCompute(
        this.strings,
        this.options.ngramSize,
        this.options.numPermutations,
        this.hashA,
        this.hashB,
        this.options.workers,
        this.options.batchSize
      );
    } else {
      this.signatures = computeAllSignatures(
        this.strings,
        this.options.ngramSize,
        this.options.numPermutations,
        this.hashA,
        this.hashB,
        this.options.preprocess
      );
    }
  }

  query(str: string): DuplicatePair[] {
    if (!this.signatures) {
      throw new Error("Index not built. Call buildIndex() first.");
    }
    return querySignatures(
      str,
      this.options,
      this.signatures,
      this.hashA,
      this.hashB,
      this.strings.length
    );
  }
}
