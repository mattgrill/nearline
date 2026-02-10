# nearline

High-performance near-duplicate string detection for large datasets (60k+ strings). Uses **MinHash + Locality-Sensitive Hashing (LSH)** to reduce pairwise comparisons from O(n^2) to near-linear time.

## Packages

| Package | Description | Install |
|---|---|---|
| [`@mattgrill/nearline-core`](./packages/core) | Platform-agnostic core algorithms | `npm i @mattgrill/nearline-core` |
| [`@mattgrill/nearline-web`](./packages/client) | Browser build with Web Worker parallelism | `npm i @mattgrill/nearline-web` |
| [`@mattgrill/nearline-node`](./packages/server) | Node.js build with `worker_threads` parallelism | `npm i @mattgrill/nearline-node` |

Most users should install **`@mattgrill/nearline-web`** (browser) or **`@mattgrill/nearline-node`** (Node.js). The core package is pulled in automatically as a dependency.

## Quick Start

### Node.js

```ts
import { findDuplicates } from "@mattgrill/nearline-node";

const result = await findDuplicates([
  "the quick brown fox jumps over the lazy dog",
  "the quick brown fox jumps over the lazy cat",
  "something entirely different",
], { threshold: 0.7 });

console.log(result.pairs);
// [{ indexA: 0, indexB: 1, similarity: 0.875 }]

console.log(result.groups);
// [{ indices: [0, 1] }]
```

### Browser

```ts
import { findDuplicates } from "@mattgrill/nearline-web";

const result = await findDuplicates(strings, {
  threshold: 0.8,
  // Optional: enable Web Worker parallelism for large datasets
  workerUrl: new URL("@mattgrill/nearline-web/worker", import.meta.url),
});
```

### Class API

Both packages also export a `DuplicateFinder` class for incremental use and querying against a pre-built index:

```ts
import { DuplicateFinder } from "@mattgrill/nearline-node";

const finder = new DuplicateFinder({ threshold: 0.7 });
finder.addStrings(corpus);
await finder.buildIndex();

const matches = finder.query("new string to check against the corpus");
// [{ indexA: -1, indexB: 42, similarity: 0.91 }, ...]
```

## API

### `findDuplicates(strings, options?)`

Find all near-duplicate pairs in an array of strings.

**Returns** `Promise<FindDuplicatesResult>`

```ts
interface FindDuplicatesResult {
  pairs: DuplicatePair[];      // All duplicate pairs above the threshold
  groups: DuplicateGroup[];    // Transitive duplicate groups (via Union-Find)
  stats: FindDuplicatesStats;  // Timing and candidate counts
}

interface DuplicatePair {
  indexA: number;       // Index of first string
  indexB: number;       // Index of second string
  similarity: number;   // Estimated Jaccard similarity (0-1)
}

interface DuplicateGroup {
  indices: number[];    // All string indices in this group
}
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `threshold` | `number` | `0.8` | Jaccard similarity threshold (0-1). Pairs below this are discarded. |
| `ngramSize` | `number` | `3` | Character n-gram (shingle) size. |
| `numPermutations` | `number` | `128` | MinHash signature size. More = higher accuracy, slower. |
| `numBands` | `number` | `32` | LSH bands. `numBands * bandSize` should equal `numPermutations`. |
| `bandSize` | `number` | `4` | Rows per LSH band. |
| `workers` | `number \| "auto"` | `"auto"` | Worker count. `0` = single-threaded, `"auto"` = CPU count - 1. |
| `batchSize` | `number` | `1000` | Strings per worker batch. |
| `preprocess` | `(s: string) => string` | `null` | Transform applied before shingling (e.g., `s => s.toLowerCase()`). |
| `seed` | `number` | `42` | Random seed for reproducible MinHash permutations. |

The browser package (`@mattgrill/nearline-web`) adds one additional option:

| Option | Type | Default | Description |
|---|---|---|---|
| `workerUrl` | `URL \| string` | `undefined` | URL to the compiled Web Worker script. Required for parallel mode. |

## How It Works

The algorithm runs a five-stage pipeline:

```
Input strings
    |
    v
1. Shingle ──────── Character trigrams hashed via FNV-1a (no substring allocation)
    |
    v
2. MinHash ──────── 128-permutation signature per string (Uint32Array)
    |                Uses multiply-xorshift mixing: Math.imul based, no BigInt
    |
    v
3. LSH Band ─────── 32 bands x 4 rows. Strings sharing any band bucket are candidates.
    |
    v
4. Verify ───────── Estimate Jaccard similarity from signatures. Filter by threshold.
    |
    v
5. Group ────────── Union-Find produces transitive duplicate groups.
```

**Why MinHash + LSH?** A naive pairwise approach on 60k strings requires ~1.8 billion comparisons. MinHash + LSH reduces this to near-linear time by only comparing strings that are likely similar based on their hash signatures.

### Performance characteristics

- All hot-path data stored in contiguous `Uint32Array` buffers (~30 MB for 60k strings)
- FNV-1a hashing operates directly on `charCodeAt` values with no intermediate string allocation
- MinHash uses `Math.imul`-based multiply-xorshift mixing instead of modular arithmetic
- LSH candidate pairs encoded as plain numbers (`a * n + b`) to avoid `BigInt` overhead
- Workers auto-enabled above 5,000 strings; below that, single-threaded is faster

## Project Structure

```
nearline/
  packages/
    core/                  # @mattgrill/nearline-core
      src/
        index.ts           # Public exports
        types.ts           # All TypeScript interfaces
        pipeline.ts        # Shared pipeline: resolve options, execute, query
        fnv1a.ts           # FNV-1a hash (string + Uint32Array variants)
        shingler.ts        # N-gram hashing
        minhash.ts         # MinHash signature computation
        lsh.ts             # LSH banding + candidate generation
        union-find.ts      # Disjoint-set for grouping
      tests/
    client/                # @mattgrill/nearline-web
      src/
        finder.ts          # Browser findDuplicates() + DuplicateFinder
        workers/
          pool.ts          # Web Worker pool
          minhash-worker.ts
      tests/
    server/                # @mattgrill/nearline-node
      src/
        finder.ts          # Node.js findDuplicates() + DuplicateFinder
        workers/
          pool.ts          # worker_threads pool
          minhash-worker.ts
      tests/
  scripts/
    bump-version.mjs       # Lockstep version bump across all packages
    publish.mjs            # Manual publish to npm with provenance
  .github/workflows/
    ci-cd.yml              # Test, version bump, publish to npm + GitHub Packages
```

## Development

### Prerequisites

- Node.js >= 24 (see `.nvmrc`)
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`)
- Yarn 4.6.0 (managed via Corepack)

### Setup

```sh
git clone https://github.com/mattgrill/nearline.git
cd nearline
corepack enable
yarn install
```

### Commands

| Command | Description |
|---|---|
| `yarn build` | Build all packages (rspack + tsc declarations) |
| `yarn test` | Run all unit and integration tests |
| `yarn test:watch` | Run tests in watch mode |
| `yarn bench` | Run benchmarks (1k, 10k, 60k strings) |
| `yarn lint` | Type-check all packages |
| `yarn publish:npm` | Manually publish all packages to npm |

### Tooling

- **Build**: [Rspack](https://rspack.dev/) with [SWC](https://swc.rs/) — dual ESM + CJS output
- **Types**: `tsc --emitDeclarationOnly` for `.d.ts` generation
- **Test**: [Vitest](https://vitest.dev/) v3 with built-in benchmark support
- **Package manager**: Yarn 4 with `nodeLinker: node-modules`

### Adding tests

Tests live alongside each package in `packages/*/tests/`. The root `vitest.config.ts` aliases `@mattgrill/nearline-core` to the core source so tests run against uncompiled TypeScript without requiring a build step.

```sh
# Run a specific test file
npx vitest run packages/core/tests/minhash.test.ts

# Run benchmarks
npx vitest bench
```

## License

[MIT](./LICENSE)
