/**
 * Web Worker for browser-based parallel MinHash computation.
 * Receives string batches, computes signatures, posts results back.
 */
import { computeAllSignatures } from "@mattgrill/nearline-core";

interface WorkerInput {
  strings: string[];
  startIndex: number;
  ngramSize: number;
  numPermutations: number;
  hashA: number[];
  hashB: number[];
}

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { strings, startIndex, ngramSize, numPermutations, hashA, hashB } = event.data;

  const signatures = computeAllSignatures(
    strings,
    ngramSize,
    numPermutations,
    new Uint32Array(hashA),
    new Uint32Array(hashB),
    null
  );

  self.postMessage(
    {
      signatures: signatures.buffer,
      startIndex,
      count: strings.length,
    },
    { transfer: [signatures.buffer] }
  );
};
