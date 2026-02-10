#!/usr/bin/env node

/**
 * Manually build, test, and publish all packages to npm.
 * Usage: node scripts/publish.mjs [--dry-run]
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function run(cmd, label) {
  console.log(`\n→ ${label || cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// Core is private (workspace-only), only publish web + node
const packages = ["packages/client", "packages/server"];

try {
  run("yarn lint", "Lint");
  run("yarn test", "Test");
  run("yarn build", "Build");

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Publishing packages to npm...\n`);

  const publishFlags = "--access public --no-git-checks";

  for (const pkg of packages) {
    const cmd = dryRun
      ? `npm publish ${publishFlags} --dry-run`
      : `npm publish ${publishFlags}`;
    run(`cd ${pkg} && ${cmd}`, `Publish ${pkg}${dryRun ? " (dry run)" : ""}`);
  }

  console.log("\nDone.");
} catch (err) {
  console.error("\nPublish failed:", err.message);
  process.exit(1);
}
