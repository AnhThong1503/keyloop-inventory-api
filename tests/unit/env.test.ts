import { describe, expect, test } from "vitest";
import { loadEnv } from "../../src/config/env.ts";

const validEnvironment = {
  DATABASE_URL: "postgresql://inventory:dummy@127.0.0.1:5432/inventory_dev",
};

describe("loadEnv", () => {
  test("parses valid configuration", () => {
    expect(
      loadEnv({
        ...validEnvironment,
        NODE_ENV: "test",
        PORT: "4567",
        LOG_LEVEL: "debug",
      }),
    ).toEqual({
      NODE_ENV: "test",
      PORT: 4567,
      DATABASE_URL: validEnvironment.DATABASE_URL,
      LOG_LEVEL: "debug",
    });
  });

  test("applies defaults", () => {
    expect(loadEnv(validEnvironment)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL: validEnvironment.DATABASE_URL,
      LOG_LEVEL: "info",
    });
  });

  test.each([
    ["NODE_ENV", "private-staging-value"],
    ["PORT", "private-invalid-port-value"],
    ["DATABASE_URL", "private-invalid-database-url"],
    ["LOG_LEVEL", "private-invalid-log-level"],
  ])("reports invalid %s without exposing its value", (name, secretValue) => {
    const source = {
      ...validEnvironment,
      [name]: secretValue,
    };

    expect(() => loadEnv(source)).toThrow(name);
    try {
      loadEnv(source);
    } catch (error) {
      expect((error as Error).message).not.toContain(secretValue);
    }
  });

  test("reports all invalid variable names without values", () => {
    const source = {
      DATABASE_URL: "sensitive-invalid-url-value",
      PORT: "sensitive-invalid-port-value",
      LOG_LEVEL: "sensitive-invalid-log-level-value",
    };

    try {
      loadEnv(source);
      throw new Error("Expected environment validation to fail");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("PORT");
      expect(message).toContain("LOG_LEVEL");
      expect(message).not.toContain("sensitive-invalid");
    }
  });

  test("requires DATABASE_URL", () => {
    expect(() => loadEnv({})).toThrow("DATABASE_URL");
  });
});
