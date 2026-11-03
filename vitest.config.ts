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
          env: {
            TZ: process.env.TEST_TZ ?? "UTC",
          },
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
    coverage: {
      provider: "v8",
      include: ["src/modules/vehicles/domain/**/*.ts", "src/modules/vehicles/vehicle.service.ts"],
      thresholds: {
        lines: 90,
        branches: 90,
        perFile: true,
      },
    },
  },
});
