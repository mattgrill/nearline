#!/usr/bin/env node

/**
 * Bump the version of all workspace packages in lockstep.
 * Usage: node scripts/bump-version.mjs [major|minor|patch]
 * Default: minor
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const bumpType = process.argv[2] || "minor";
const validTypes = ["major", "minor", "patch"];
if (!validTypes.includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}. Use: ${validTypes.join(", ")}`);
  process.exit(1);
}

const rootDir = new URL("..", import.meta.url).pathname;
const packages = ["packages/core", "packages/client", "packages/server"];

// Read current version from first package
const firstPkg = JSON.parse(
  readFileSync(join(rootDir, packages[0], "package.json"), "utf-8")
);
const [major, minor, patch] = firstPkg.version.split(".").map(Number);

let newVersion;
switch (bumpType) {
  case "major":
    newVersion = `${major + 1}.0.0`;
    break;
  case "minor":
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case "patch":
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`Bumping version: ${firstPkg.version} -> ${newVersion} (${bumpType})`);

// Update all package.json files
for (const pkgDir of packages) {
  const pkgPath = join(rootDir, pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = newVersion;

  // Update workspace dependency versions
  for (const depField of ["dependencies", "peerDependencies"]) {
    if (!pkg[depField]) continue;
    for (const [name, version] of Object.entries(pkg[depField])) {
      if (
        name.startsWith("@mattgrill/nearline-") &&
        version.startsWith("^")
      ) {
        pkg[depField][name] = `^${newVersion}`;
      }
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  Updated ${pkgDir}/package.json`);
}

// Git operations
execSync("git add -A", { cwd: rootDir, stdio: "inherit" });
execSync(
  `git commit -m "chore: bump version to ${newVersion} [skip ci]"`,
  { cwd: rootDir, stdio: "inherit" }
);
execSync(`git tag v${newVersion}`, { cwd: rootDir, stdio: "inherit" });

console.log(`Done. Tagged as v${newVersion}`);
