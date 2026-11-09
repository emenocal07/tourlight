import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tsc = path.join(repoRoot, "node_modules", ".bin", "tsc");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const CORE = "@emenocal07/tourlight-core";
const WEB = "@emenocal07/tourlight";

let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL  ${name}\n      ${String(error?.message ?? error)
        .split("\n")
        .join("\n      ")}`,
    );
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Runs a snippet with the consumer as cwd so bare specifiers resolve against its node_modules.
function runNode(consumer, code, { esm = false } = {}) {
  const args = esm ? ["--input-type=module", "-e", code] : ["-e", code];
  return spawnSync(process.execPath, args, { cwd: consumer, encoding: "utf8" });
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const tmp = mkdtempSync(path.join(tmpdir(), "tourlight-smoke-"));

try {
  const packDir = path.join(tmp, "packs");
  const consumer = path.join(tmp, "consumer");
  mkdirSync(packDir);
  mkdirSync(consumer);

  for (const workspace of [CORE, WEB]) {
    run(
      npm,
      ["pack", "-w", workspace, "--pack-destination", packDir],
      repoRoot,
    );
  }
  const tarballs = readdirSync(packDir)
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => path.join(packDir, file));
  assert(
    tarballs.length === 2,
    `expected 2 tarballs, found ${tarballs.length}`,
  );

  writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({
      name: "tourlight-smoke-consumer",
      version: "0.0.0",
      private: true,
    }),
  );
  // One install: web depends on core 0.1.0 (not on npm yet) and needs React as a peer.
  run(
    npm,
    [
      "install",
      "--no-audit",
      "--no-fund",
      ...tarballs,
      "react@^19",
      "react-dom@^19",
      "@types/react@^19",
    ],
    consumer,
  );

  check("(a) require(core) exposes tourReducer", () => {
    const result = runNode(
      consumer,
      `const m = require("${CORE}"); if (typeof m.tourReducer !== "function") process.exit(3);`,
    );
    assert(result.status === 0, `exit ${result.status}: ${result.stderr}`);
  });

  check("(b) import(web) ESM exposes createTour", () => {
    const result = runNode(
      consumer,
      `const m = await import("${WEB}"); if (typeof m.createTour !== "function") process.exit(3);`,
      { esm: true },
    );
    assert(result.status === 0, `exit ${result.status}: ${result.stderr}`);
  });

  check("(c) require(web) CJS exposes createTour", () => {
    const result = runNode(
      consumer,
      `const m = require("${WEB}"); if (typeof m.createTour !== "function") process.exit(3);`,
    );
    assert(result.status === 0, `exit ${result.status}: ${result.stderr}`);
  });

  check("(d) deep import of dist/index.cjs is blocked by exports", () => {
    const result = runNode(
      consumer,
      `try { require("${WEB}/dist/index.cjs"); process.exit(3); } catch (e) { process.exit(e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" ? 0 : 4); }`,
    );
    assert(
      result.status === 0,
      `deep require was not rejected with ERR_PACKAGE_PATH_NOT_EXPORTED (exit ${result.status}): ${result.stderr}`,
    );
  });

  check("(e) style.css resolves and contains --tour-default-primary", () => {
    const result = runNode(
      consumer,
      `process.stdout.write(require.resolve("${WEB}/style.css"))`,
    );
    assert(result.status === 0, `resolve failed: ${result.stderr}`);
    const file = result.stdout.trim();
    assert(existsSync(file), `resolved path does not exist: ${file}`);
    assert(
      readFileSync(file, "utf8").includes("--tour-default-primary"),
      "CSS lacks --tour-default-primary",
    );
  });

  check(
    "(f) installed web package.json has no workspace:/file: dependency",
    () => {
      const manifest = JSON.parse(
        readFileSync(
          path.join(
            consumer,
            "node_modules",
            "@emenocal07",
            "tourlight",
            "package.json",
          ),
          "utf8",
        ),
      );
      for (const section of [
        "dependencies",
        "peerDependencies",
        "optionalDependencies",
      ]) {
        for (const [name, range] of Object.entries(manifest[section] ?? {})) {
          assert(
            !/^(workspace:|file:|link:)/.test(range),
            `${section}.${name} = ${range}`,
          );
        }
      }
      assert(
        manifest.dependencies[CORE] === "0.1.0",
        `core dependency is ${manifest.dependencies[CORE]}`,
      );
    },
  );

  const typesSource = `import { createTour } from "${WEB}";
import type { ComponentProps } from "react";
import type { TourVariant } from "${WEB}";

const tour = createTour({
  welcome: { order: 1, title: "Welcome", content: "Hello" },
  done: { order: 2, title: "Done", content: "Bye" },
});
type StepId = ComponentProps<typeof tour.TourStep>["id"];
export const ok: StepId = "welcome";
// @ts-expect-error unknown step id must be rejected
export const bad: StepId = "nope";
export const variant: TourVariant = "glass";
// @ts-expect-error unknown variant must be rejected
export const badVariant: TourVariant = "nope";
`;
  writeFileSync(path.join(consumer, "consumerEsm.mts"), typesSource);
  writeFileSync(path.join(consumer, "consumerCjs.cts"), typesSource);

  check(
    "(g) types resolve and typed ids hold (ESM .mts and CJS .cts, node16, strict)",
    () => {
      const result = spawnSync(
        tsc,
        [
          "--noEmit",
          "--strict",
          "--module",
          "node16",
          "--moduleResolution",
          "node16",
          "--skipLibCheck",
          "false",
          "consumerEsm.mts",
          "consumerCjs.cts",
        ],
        { cwd: consumer, encoding: "utf8" },
      );
      assert(
        result.status === 0,
        `tsc exit ${result.status}\n${result.stdout}${result.stderr}`,
      );
    },
  );
} catch (error) {
  failures += 1;
  console.log(`FAIL  setup\n      ${String(error?.message ?? error)}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
