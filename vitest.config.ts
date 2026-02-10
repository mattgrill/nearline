import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@mattgrill/nearline-core": resolve(
        __dirname,
        "packages/core/src/index.ts"
      ),
    },
  },
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    benchmark: {
      include: ["packages/*/tests/**/*.bench.ts"],
    },
    testTimeout: 30000,
  },
});
