import { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Run from a package's "prepack" script: npm ships the README and LICENSE found inside the
// package directory, so the repo-root copies are mirrored there (and git-ignored) at pack time.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
// npm runs lifecycle scripts with the package directory as cwd.
const packageDir = process.cwd();

const files = ["LICENSE"];
if (process.argv.includes("--readme")) files.push("README.md");

for (const file of files) {
  copyFileSync(path.join(repoRoot, file), path.join(packageDir, file));
}
