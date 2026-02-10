import { resolve } from "node:path";

const __dirname = import.meta.dirname;

const common = {
  entry: { index: resolve(__dirname, "src/index.ts") },
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
  {
    ...common,
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].js",
      library: { type: "module" },
    },
    experiments: { outputModule: true },
  },
  {
    ...common,
    output: {
      path: resolve(__dirname, "dist"),
      filename: "[name].cjs",
      library: { type: "commonjs2" },
    },
  },
];

export default configs;
