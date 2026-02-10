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
import { createWebWorkerCompute, type WebWorkerPoolOptions } from "./workers/pool";

/** Browser-specific options extending the base options */
export interface ClientDuplicateFinderOptions extends DuplicateFinderOptions {
  /**
   * URL to the compiled Web Worker script.
   * Required for parallel computation in the browser.
   *
   * Example with Vite:
   * ```ts
   * workerUrl: new URL('@mattgrill/duplicate-finder-client/worker', import.meta.url)
   * ```
   *
   * If omitted, runs single-threaded.
   */
  workerUrl?: URL | string;
}

function getDefaultWorkers(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return Math.max(1, navigator.hardwareConcurrency - 1);
  }
  return 1;
}

/**
 * Find near-duplicate strings in a dataset (browser-optimized).
 * Uses Web Workers for parallel computation when workerUrl is provided.
 */
export async function findDuplicates(
  strings: string[],
  opts?: ClientDuplicateFinderOptions
): Promise<FindDuplicatesResult> {
  const options = resolveOptions(opts, getDefaultWorkers());
  const parallelCompute = createWebWorkerCompute({
    workerUrl: opts?.workerUrl,
  });
  return executePipeline(strings, options, parallelCompute);
}

/**
 * Class API for incremental use and querying against a built index (browser-optimized).
 */
export class DuplicateFinder {
  private options: ResolvedOptions;
  private workerPoolOptions: WebWorkerPoolOptions;
  private strings: string[] = [];
  private signatures: Uint32Array | null = null;
  private hashA: Uint32Array;
  private hashB: Uint32Array;

  constructor(opts?: ClientDuplicateFinderOptions) {
    this.options = resolveOptions(opts, getDefaultWorkers());
    this.workerPoolOptions = { workerUrl: opts?.workerUrl };
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
    const parallelCompute = createWebWorkerCompute(this.workerPoolOptions);

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
