import { readFile } from "node:fs/promises";
import { afterAll, describe, expect, test } from "vitest";
import request from "supertest";
import { buildTestApp, FIXED_NOW_ISO } from "../helpers/test-database.ts";

describe("interactive API documentation", () => {
  const context = buildTestApp({ nowIso: FIXED_NOW_ISO });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  test.each(["/docs", "/docs/"])("serves the Scalar reference at %s", async (path) => {
    const response = await request(context.app).get(path).expect(200);

    expect(response.type).toBe("text/html");
    expect(response.text).toContain('id="app"');
    expect(response.text).toContain("Scalar.createApiReference");
    expect(response.text).toContain("/openapi.yaml");
    expect(response.text).not.toContain('"code":"ROUTE_NOT_FOUND"');
    expect(response.headers["content-security-policy"]).toContain("https://cdn.jsdelivr.net");
    expect(response.headers["content-security-policy"]).toMatch(
      /script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/,
    );
  });

  test("serves the exact OpenAPI source as YAML", async () => {
    const specification = await readFile(
      new URL("../../docs/openapi.yaml", import.meta.url),
      "utf8",
    );
    const response = await request(context.app).get("/openapi.yaml").expect(200);

    expect(response.type).toBe("application/yaml");
    expect(response.text).toBe(specification);
  });

  test("keeps the existing Helmet policy on API routes", async () => {
    const documentationResponse = await request(context.app).get("/docs").expect(200);
    const healthResponse = await request(context.app).get("/health").expect(200);

    expect(healthResponse.headers["content-security-policy"]).not.toContain(
      "https://cdn.jsdelivr.net",
    );
    expect(healthResponse.headers["content-security-policy"]).not.toContain("'nonce-");
    expect(healthResponse.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(healthResponse.headers["content-security-policy"]).not.toBe(
      documentationResponse.headers["content-security-policy"],
    );
  });
});
