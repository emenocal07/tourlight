import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "core", root: "packages/core", environment: "node" } },
      {
        test: {
          name: "web",
          root: "packages/web",
          environment: "jsdom",
          setupFiles: ["./src/test/setupTests.ts"],
        },
      },
    ],
  },
});
