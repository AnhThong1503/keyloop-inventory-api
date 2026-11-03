import { describe, expect, test } from "vitest";
import { assertTestDatabase } from "../helpers/assert-test-database.ts";

describe("assertTestDatabase", () => {
  test("rejects a development database URL", () => {
    expect(() => assertTestDatabase("postgresql://127.0.0.1:5432/inventory_dev")).toThrow(
      /database name ends in "_test"/,
    );
  });

  test("accepts a test database URL", () => {
    expect(() => assertTestDatabase("postgresql://127.0.0.1:5433/inventory_test")).not.toThrow();
  });

  test("rejects garbage without including the URL in the error", () => {
    expect(() => assertTestDatabase("not a database URL")).toThrow(
      'Integration tests require a valid PostgreSQL URL whose database name ends in "_test".',
    );
  });
});
