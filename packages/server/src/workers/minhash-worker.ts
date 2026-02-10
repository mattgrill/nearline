import { parentPort, workerData } from "node:worker_threads";
import { computeAllSignatures } from "@mattgrill/nearline-core";

interface WorkerInput {
  strings: string[];
  startIndex: number;
  ngramSize: number;
  numPermutations: number;
  hashA: number[];
  hashB: number[];
}

const data = workerData as WorkerInput;
const { strings, startIndex, ngramSize, numPermutations } = data;
const hashA = new Uint32Array(data.hashA);
const hashB = new Uint32Array(data.hashB);

const signatures = computeAllSignatures(
  strings, ngramSize, numPermutations, hashA, hashB, null
);

parentPort!.postMessage({
  signatures: Array.from(signatures),
  startIndex,
  count: strings.length,
});
