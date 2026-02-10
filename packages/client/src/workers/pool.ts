import type { ParallelComputeFn } from "@mattgrill/nearline-core";

/**
 * Options for creating the Web Worker pool.
 */
export interface WebWorkerPoolOptions {
  /**
   * URL to the compiled worker script.
   * - If using a bundler like Vite: `new URL('./minhash-worker.js', import.meta.url)`
   * - If self-hosting: URL to the worker file from this package's `./worker` export
   * - If omitted: falls back to single-threaded computation
   */
  workerUrl?: URL | string;
}

/**
 * Create a parallel compute function using Web Workers.
 * Returns null if workerUrl is not provided.
 */
export function createWebWorkerCompute(
  options: WebWorkerPoolOptions
): ParallelComputeFn | null {
  if (!options.workerUrl) return null;
  if (typeof Worker === "undefined") return null;

  const workerUrl = options.workerUrl;

  return async (
    strings: string[],
    ngramSize: number,
    numPermutations: number,
    hashA: Uint32Array,
    hashB: Uint32Array,
    numWorkers: number,
    batchSize: number
  ): Promise<Uint32Array> => {
    const n = strings.length;
    const signatures = new Uint32Array(n * numPermutations);

    // Create batches
    const batches: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < n; i += batchSize) {
      batches.push({ start: i, end: Math.min(i + batchSize, n) });
    }

    const actualWorkers = Math.min(numWorkers, batches.length);
    let batchIndex = 0;

    const hashAArr = Array.from(hashA);
    const hashBArr = Array.from(hashB);

    const processBatch = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const processNext = (): void => {
          if (batchIndex >= batches.length) {
            resolve();
            return;
          }

          const batch = batches[batchIndex++];
          const batchStrings = strings.slice(batch.start, batch.end);

          const worker = new Worker(workerUrl, { type: "module" });

          worker.onmessage = (
            event: MessageEvent<{
              signatures: ArrayBuffer;
              startIndex: number;
              count: number;
            }>
          ) => {
            const resultSigs = new Uint32Array(event.data.signatures);
            const offset = event.data.startIndex * numPermutations;
            signatures.set(resultSigs, offset);
            worker.terminate();
            processNext();
          };

          worker.onerror = (err) => {
            worker.terminate();
            reject(new Error(err.message));
          };

          worker.postMessage({
            strings: batchStrings,
            startIndex: batch.start,
            ngramSize,
            numPermutations,
            hashA: hashAArr,
            hashB: hashBArr,
          });
        };

        processNext();
      });
    };

    const workerPromises: Promise<void>[] = [];
    for (let i = 0; i < actualWorkers; i++) {
      workerPromises.push(processBatch());
    }

    await Promise.all(workerPromises);
    return signatures;
  };
}
