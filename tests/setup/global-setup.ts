import "dotenv/config";
import { execSync } from "node:child_process";
import { assertTestDatabase, DEFAULT_TEST_DATABASE_URL } from "../helpers/assert-test-database.ts";

export function setupIntegrationDatabase(): void {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  assertTestDatabase(databaseUrl);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

export default setupIntegrationDatabase;
