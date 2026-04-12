import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    globals: true,
    setupFiles: [],
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
