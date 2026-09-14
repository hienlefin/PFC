import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    css: false,
    env: {
      CLUB_SESSION_SECRET: "test-club-session-secret-do-not-use-in-prod",
      CLUB_DB_PATH: path.join(os.tmpdir(), "pfc-club-vitest.sqlite"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
