import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Mirror the "@/*" tsconfig path alias without pulling in an extra plugin.
  resolve: {
    alias: { "@": resolve(root) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
