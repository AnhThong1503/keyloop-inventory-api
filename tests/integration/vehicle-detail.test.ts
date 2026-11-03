import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import {
  buildTestApp,
  createDealership,
  createVehicle,
  FIXED_NOW_ISO,
  resetDatabase,
} from "../helpers/test-database.ts";

const fixedNow = new Date(FIXED_NOW_ISO);

describe("GET /api/vehicles/:id", () => {
  const context = buildTestApp({ nowIso: FIXED_NOW_ISO });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  test("returns every public vehicle field and dealership details", async () => {
    const dealership = await createDealership(context.prisma);
    const vehicle = await createVehicle(
      context.prisma,
      { ageInDays: 90, dealershipId: dealership.id },
      fixedNow,
    );

    const response = await request(context.app).get(`/api/vehicles/${vehicle.id}`).expect(200);

    expect(response.body).toEqual({
      data: {
        id: vehicle.id,
        vin: vehicle.vin,
        make: "Toyota",
        model: "Camry",
        year: 2024,
        colour: "Blue",
        inventoryDate: "2026-07-31",
        ageInDays: 90,
        isAgingStock: false,
        proposedAction: "NONE",
        actionNote: null,
        actionUpdatedAt: null,
        dealership: { id: dealership.id, name: dealership.name },
      },
    });
  });

  test("derives the strict aging boundary for 90- and 91-day vehicles", async () => {
    const dealership = await createDealership(context.prisma);
    const vehicle90 = await createVehicle(
      context.prisma,
      { ageInDays: 90, dealershipId: dealership.id },
      fixedNow,
    );
    const vehicle91 = await createVehicle(
      context.prisma,
      { ageInDays: 91, dealershipId: dealership.id },
      fixedNow,
    );

    const response90 = await request(context.app).get(`/api/vehicles/${vehicle90.id}`).expect(200);
    const response91 = await request(context.app).get(`/api/vehicles/${vehicle91.id}`).expect(200);

    expect(response90.body.data).toMatchObject({ ageInDays: 90, isAgingStock: false });
    expect(response91.body.data).toMatchObject({ ageInDays: 91, isAgingStock: true });
  });

  test("returns the same DTO in detail and list responses", async () => {
    const dealership = await createDealership(context.prisma);
    const vehicle = await createVehicle(
      context.prisma,
      { ageInDays: 45, dealershipId: dealership.id },
      fixedNow,
    );

    const detail = await request(context.app).get(`/api/vehicles/${vehicle.id}`).expect(200);
    const list = await request(context.app).get("/api/vehicles").expect(200);
    const listedVehicle = list.body.data.find((item: { id: string }) => item.id === vehicle.id);

    expect(detail.body.data).toEqual(listedVehicle);
  });

  test("returns VEHICLE_NOT_FOUND with a request id for an unknown UUID", async () => {
    const requestId = "vehicle-detail-missing";
    const response = await request(context.app)
      .get("/api/vehicles/9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f")
      .set("x-request-id", requestId)
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: "VEHICLE_NOT_FOUND",
      requestId,
    });
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(JSON.stringify(response.body)).not.toMatch(/Prisma|at\s+\w+\s*\(/i);
  });

  test("returns VALIDATION_ERROR with a request id for an invalid id", async () => {
    const requestId = "vehicle-detail-invalid";
    const response = await request(context.app)
      .get("/api/vehicles/abc")
      .set("x-request-id", requestId)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId,
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(JSON.stringify(response.body)).not.toMatch(/Prisma|at\s+\w+\s*\(/i);
  });
});
