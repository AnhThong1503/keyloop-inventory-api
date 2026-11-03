import { describe, expect, test, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.ts";
import type { HealthPrismaClient } from "../../src/modules/health/health.routes.ts";
import type {
  VehicleRecord,
  VehicleRepository,
} from "../../src/modules/vehicles/vehicle.repository.ts";
import type { Clock } from "../../src/shared/clock.ts";
import { createLoggerMock } from "./logger-mock.ts";

const fixedTimestamp = new Date("2026-10-29T12:00:00.000Z");
const fixedClock: Clock = { now: () => fixedTimestamp };
const patchVehicleId = "b0000000-0000-4000-8000-000000000001";

const patchVehicle: VehicleRecord = {
  id: patchVehicleId,
  vin: "TEST0000000000001",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  colour: "Blue",
  inventoryDate: new Date("2026-09-14T00:00:00.000Z"),
  proposedAction: "NONE",
  actionNote: null,
  actionUpdatedAt: null,
  dealership: { id: "a0000000-0000-4000-8000-000000000001", name: "Test dealership" },
};

function createPrismaStub(query: () => Promise<unknown> = async () => 1): HealthPrismaClient {
  return {
    $queryRaw: <T = unknown>() => query().then((result) => result as T),
  };
}

function createTestApp(query?: () => Promise<unknown>, vehicleRepository?: VehicleRepository) {
  const logger = createLoggerMock();
  const app = createApp({
    prisma: createPrismaStub(query),
    clock: fixedClock,
    logger,
    vehicleRepository: vehicleRepository ?? {
      findVehicles: vi.fn(async () => ({ items: [], total: 0 })),
      findVehicleById: vi.fn(async () => null),
      updateVehicleAction: vi.fn(async () => {
        throw new Error("not implemented by app unit tests");
      }),
    },
  });
  return { app, logger };
}

describe("createApp", () => {
  test("returns a healthy database status using the injected clock", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      checks: { database: "up" },
      timestamp: fixedTimestamp.toISOString(),
    });
    expect(response.body.uptimeSeconds).toEqual(expect.any(Number));
  });

  test("returns degraded status when the database query rejects", async () => {
    const { app } = createTestApp(() => Promise.reject(new Error("private database details")));
    const response = await request(app).get("/health").expect(503);

    expect(response.body).toMatchObject({
      status: "degraded",
      checks: { database: "down" },
      timestamp: fixedTimestamp.toISOString(),
    });
    expect(JSON.stringify(response.body)).not.toContain("private database details");
  });

  test("returns the route-not-found envelope with the same request id", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/unknown").set("x-request-id", "req-404").expect(404);

    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      requestId: "req-404",
    });
    expect(response.headers["x-request-id"]).toBe(response.body.error.requestId);
  });

  test("maps malformed JSON to INVALID_JSON", async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post("/health")
      .set("content-type", "application/json")
      .set("x-request-id", "invalid-json-request")
      .send("{bad")
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_JSON");
    expect(response.body.error.requestId).toBe("invalid-json-request");
    expect(response.headers["x-request-id"]).toBe(response.body.error.requestId);
  });

  test("maps oversized JSON to PAYLOAD_TOO_LARGE", async () => {
    const { app } = createTestApp();
    const body = JSON.stringify({ value: "x".repeat(11 * 1024) });
    const response = await request(app)
      .post("/health")
      .set("content-type", "application/json")
      .send(body)
      .expect(413);

    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(response.body.error.requestId).toBe(response.headers["x-request-id"]);
  });

  test("echoes a valid incoming request id", async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .get("/health")
      .set("x-request-id", "Valid.ID_123")
      .expect(200);
    expect(response.headers["x-request-id"]).toBe("Valid.ID_123");
  });

  test.each(["has spaces", "x".repeat(65), "has/slash"])(
    "replaces invalid request id %s",
    async (requestId) => {
      const { app } = createTestApp();
      const response = await request(app).get("/health").set("x-request-id", requestId).expect(200);
      expect(response.headers["x-request-id"]).not.toBe(requestId);
      expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  test("generates a request id when one is absent", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/health").expect(200);
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("logs only the request path and includes its request id", async () => {
    const { app, logger } = createTestApp();
    await request(app)
      .get("/health?do-not-log=this-value")
      .set("x-request-id", "log-test-123")
      .expect(200);

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "log-test-123",
        method: "GET",
        path: "/health",
        statusCode: 200,
      }),
      "http request",
    );
    const loggedFields = vi.mocked(logger.debug).mock.calls[0]?.[0];
    expect(JSON.stringify(loggedFields)).not.toContain("do-not-log");
    expect(loggedFields).not.toHaveProperty("headers");
    expect(loggedFields).not.toHaveProperty("body");
  });

  test("returns a generic error envelope for repository failures on list, detail, and PATCH", async () => {
    const privateMessage = "private driver text: database password must stay server-side";
    const repository: VehicleRepository = {
      findVehicles: vi.fn(async () => {
        throw new Error(privateMessage);
      }),
      findVehicleById: vi.fn(async (id) => {
        if (id === patchVehicleId) {
          return patchVehicle;
        }
        throw new Error(privateMessage);
      }),
      updateVehicleAction: vi.fn(async () => {
        throw new Error(privateMessage);
      }),
    };
    const { app } = createTestApp(undefined, repository);

    const responses = [
      await request(app).get("/api/vehicles").expect(500),
      await request(app).get("/api/vehicles/b0000000-0000-4000-8000-000000000002").expect(500),
      await request(app)
        .patch(`/api/vehicles/${patchVehicleId}/action`)
        .send({ action: "NONE" })
        .expect(500),
    ];

    for (const response of responses) {
      expect(response.body.error).toMatchObject({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: response.headers["x-request-id"],
      });
      expect(JSON.stringify(response.body)).not.toContain(privateMessage);
      expect(JSON.stringify(response.body)).not.toMatch(/driver|password|stack|Error:/i);
    }
  });
});
