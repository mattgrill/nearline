import { resolve } from "node:path";

const __dirname = import.meta.dirname;

const common = {
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript" },
              target: "es2022",
            },
          },
        },
      },
    ],
  },
  devtool: "source-map",
};

/** @type {import("@rspack/core").Configuration[]} */
const configs = [
  // Main entry — ESM
  {
    ...common,
    entry: { index: resolve(__dirname, "src/index.ts") },
    externals: ["@mattgrill/nearline-core"],
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].js",
      library: { type: "module" },
    },
    experiments: { outputModule: true },
  },
  // Main entry — CJS
  {
    ...common,
    entry: { index: resolve(__dirname, "src/index.ts") },
    externals: ["@mattgrill/nearline-core"],
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].cjs",
      library: { type: "commonjs2" },
    },
  },
  // Worker — ESM (self-contained, bundles core)
  {
    ...common,
    entry: { "minhash-worker": resolve(__dirname, "src/workers/minhash-worker.ts") },
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].js",
      library: { type: "module" },
    },
    experiments: { outputModule: true },
  },
  // Worker — CJS (self-contained, bundles core)
  {
    ...common,
    entry: { "minhash-worker": resolve(__dirname, "src/workers/minhash-worker.ts") },
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].cjs",
      library: { type: "commonjs2" },
    },
  },
];

export default configs;
