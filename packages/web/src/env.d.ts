// Bundlers replace process.env.NODE_ENV at build time; declared here to avoid depending on @types/node.
declare const process: { env: { NODE_ENV?: string } };

// Only the stylesheet test reads from disk; declared here to avoid depending on @types/node.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

interface ImportMeta {
  readonly dirname: string;
}
