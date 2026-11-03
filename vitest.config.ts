import "dotenv/config";
import { defineConfig } from "vitest/config";
import { DEFAULT_TEST_DATABASE_URL } from "./tests/helpers/assert-test-database.ts";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          env: {
            NODE_ENV: "test",
            LOG_LEVEL: "silent",
            TZ: process.env.TEST_TZ ?? "UTC",
            DATABASE_URL: testDatabaseUrl,
          },
          globalSetup: ["tests/setup/global-setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
