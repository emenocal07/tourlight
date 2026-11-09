// Bundlers replace process.env.NODE_ENV at build time; declared here to avoid depending on @types/node.
declare const process: { env: { NODE_ENV?: string } };
