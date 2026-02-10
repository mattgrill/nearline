import { Worker } from "node:worker_threads";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ParallelComputeFn } from "@mattgrill/nearline-core";

function resolveWorkerPath(): string {
  let currentDir: string;
  try {
    currentDir = dirname(fileURLToPath(import.meta.url));
  } catch {
    currentDir = __dirname;
  }
  return join(currentDir, "minhash-worker.cjs");
}

/**
 * Create a parallel compute function using Node.js worker_threads.
 * Returns null if the compiled worker file is not available.
 */
export function createNodeWorkerCompute(): ParallelComputeFn | null {
  let workerPath: string;
  try {
    workerPath = resolveWorkerPath();
  } catch {
    return null;
  }

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

    const batches: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < n; i += batchSize) {
      batches.push({ start: i, end: Math.min(i + batchSize, n) });
    }

    const actualWorkers = Math.min(numWorkers, batches.length);
    let batchIndex = 0;

    const processBatch = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const processNext = (): void => {
          if (batchIndex >= batches.length) {
            resolve();
            return;
          }

          const batch = batches[batchIndex++];
          const batchStrings = strings.slice(batch.start, batch.end);

          const worker = new Worker(workerPath, {
            workerData: {
              strings: batchStrings,
              startIndex: batch.start,
              ngramSize,
              numPermutations,
              hashA: Array.from(hashA),
              hashB: Array.from(hashB),
            },
          });

          worker.on(
            "message",
            (result: {
              signatures: number[];
              startIndex: number;
              count: number;
            }) => {
              const resultSigs = new Uint32Array(result.signatures);
              const offset = result.startIndex * numPermutations;
              signatures.set(resultSigs, offset);
              worker.terminate().then(processNext).catch(reject);
            }
          );

          worker.on("error", reject);
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
