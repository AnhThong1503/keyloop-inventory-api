import { afterAll, describe, expect, test } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.ts";
import { createPrismaClient } from "../../src/db/prisma.ts";
import { createVehicleRepository } from "../../src/modules/vehicles/vehicle.repository.ts";
import { createLogger } from "../../src/shared/logger.ts";
import { FIXED_NOW_ISO, fixedClock } from "../helpers/test-database.ts";

const prisma = createPrismaClient("postgresql://127.0.0.1:1/inventory_unreachable_test");
const app = createApp({
  prisma,
  clock: fixedClock(FIXED_NOW_ISO),
  logger: createLogger("silent", "test"),
  vehicleRepository: createVehicleRepository(prisma),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health database failure", () => {
  test("returns 503 when Prisma cannot connect to the closed port", async () => {
    const response = await request(app).get("/health").expect(503);

    expect(response.body).toMatchObject({
      status: "degraded",
      checks: { database: "down" },
      timestamp: FIXED_NOW_ISO,
    });
  });
});
