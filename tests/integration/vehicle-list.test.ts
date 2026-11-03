import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import {
  buildTestApp,
  createDealership,
  createVehicle,
  FIXED_NOW_ISO,
  resetDatabase,
} from "../helpers/test-database.ts";

const fixedNow = new Date(FIXED_NOW_ISO);

describe("GET /api/vehicles", () => {
  const context = buildTestApp({ nowIso: FIXED_NOW_ISO });

  beforeAll(async () => {
    await resetDatabase(context.prisma);
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  test("returns the default shape ordered oldest first, then by id", async () => {
    const dealership = await createDealership(context.prisma);
    const vehicles = await Promise.all(
      [0, 45, 89, 90, 91, 92, 400, 45].map((ageInDays) =>
        createVehicle(context.prisma, { ageInDays, dealershipId: dealership.id }, fixedNow),
      ),
    );
    const expected = [...vehicles].sort(
      (left, right) =>
        left.inventoryDate.getTime() - right.inventoryDate.getTime() ||
        left.id.localeCompare(right.id),
    );

    const response = await request(context.app).get("/api/vehicles").expect(200);

    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 8,
      totalPages: 1,
      asOfDate: "2026-10-29",
      agingThresholdDays: 90,
    });
    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual(
      expected.map((vehicle) => vehicle.id),
    );
    expect(response.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      400, 92, 91, 90, 89, 45, 45, 0,
    ]);
    expect(response.body.data[0]).toEqual({
      id: expected[0]?.id,
      vin: expected[0]?.vin,
      make: "Toyota",
      model: "Camry",
      year: 2024,
      colour: "Blue",
      inventoryDate: "2025-09-24",
      ageInDays: 400,
      isAgingStock: true,
      proposedAction: "NONE",
      actionNote: null,
      actionUpdatedAt: null,
      dealership: { id: dealership.id, name: dealership.name },
    });
    expect(response.body.data[0]).not.toHaveProperty("createdAt");
    expect(response.body.data[0]).not.toHaveProperty("dealershipId");
  });

  test("applies aging true and false with a strict 90-day boundary", async () => {
    const dealership = await createDealership(context.prisma);
    await Promise.all(
      [0, 45, 89, 90, 91, 92, 400].map((ageInDays) =>
        createVehicle(context.prisma, { ageInDays, dealershipId: dealership.id }, fixedNow),
      ),
    );

    const aging = await request(context.app).get("/api/vehicles?aging=true").expect(200);
    const notAging = await request(context.app).get("/api/vehicles?aging=false").expect(200);

    expect(aging.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      400, 92, 91,
    ]);
    expect(notAging.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      90, 89, 45, 0,
    ]);
    expect(notAging.body.data[0].isAgingStock).toBe(false);
  });

  test("applies inclusive minimum and maximum age filters", async () => {
    const dealership = await createDealership(context.prisma);
    await Promise.all(
      [0, 45, 89, 90, 91, 92, 400].map((ageInDays) =>
        createVehicle(context.prisma, { ageInDays, dealershipId: dealership.id }, fixedNow),
      ),
    );

    const min90 = await request(context.app).get("/api/vehicles?minAgeDays=90").expect(200);
    const max90 = await request(context.app).get("/api/vehicles?maxAgeDays=90").expect(200);
    const min91 = await request(context.app).get("/api/vehicles?minAgeDays=91").expect(200);
    const from50to100 = await request(context.app)
      .get("/api/vehicles?minAgeDays=50&maxAgeDays=100")
      .expect(200);

    expect(min90.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      400, 92, 91, 90,
    ]);
    expect(max90.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      90, 89, 45, 0,
    ]);
    expect(min91.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      400, 92, 91,
    ]);
    expect(from50to100.body.data.map((item: { ageInDays: number }) => item.ageInDays)).toEqual([
      92, 91, 90, 89,
    ]);
  });

  test("returns an empty result for contradictory aging and age filters", async () => {
    const dealership = await createDealership(context.prisma);
    await createVehicle(context.prisma, { ageInDays: 400, dealershipId: dealership.id }, fixedNow);

    const response = await request(context.app)
      .get("/api/vehicles?aging=true&maxAgeDays=50")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [],
      meta: { totalItems: 0, totalPages: 0 },
    });
  });

  test("filters by case-insensitive make and model and dealership", async () => {
    const firstDealership = await createDealership(context.prisma);
    const secondDealership = await createDealership(context.prisma);
    const camry = await createVehicle(
      context.prisma,
      { ageInDays: 1, dealershipId: firstDealership.id, make: "Toyota", model: "Camry" },
      fixedNow,
    );
    const corolla = await createVehicle(
      context.prisma,
      { ageInDays: 2, dealershipId: firstDealership.id, make: "Toyota", model: "Corolla" },
      fixedNow,
    );
    await createVehicle(
      context.prisma,
      { ageInDays: 3, dealershipId: secondDealership.id, make: "Honda", model: "Civic" },
      fixedNow,
    );

    const make = await request(context.app).get("/api/vehicles?make=toyota").expect(200);
    const model = await request(context.app).get("/api/vehicles?model=camry").expect(200);
    const combined = await request(context.app)
      .get("/api/vehicles?make=toyota&model=camry")
      .expect(200);
    const trimmed = await request(context.app)
      .get("/api/vehicles")
      .query({ make: "  Toyota  " })
      .expect(200);
    const dealer = await request(context.app)
      .get(`/api/vehicles?dealershipId=${firstDealership.id}`)
      .expect(200);

    expect(make.body.data.map((item: { id: string }) => item.id).sort()).toEqual(
      [camry.id, corolla.id].sort(),
    );
    expect(model.body.data.map((item: { id: string }) => item.id)).toEqual([camry.id]);
    expect(combined.body.data.map((item: { id: string }) => item.id)).toEqual([camry.id]);
    expect(trimmed.body.data).toHaveLength(2);
    expect(dealer.body.data.map((item: { id: string }) => item.id).sort()).toEqual(
      [camry.id, corolla.id].sort(),
    );
  });

  test("paginates without overlap and returns an empty page past the end", async () => {
    const dealership = await createDealership(context.prisma);
    const vehicles = await Promise.all(
      Array.from({ length: 25 }, (_, ageInDays) =>
        createVehicle(context.prisma, { ageInDays, dealershipId: dealership.id }, fixedNow),
      ),
    );
    const expectedIds = [...vehicles]
      .sort(
        (left, right) =>
          left.inventoryDate.getTime() - right.inventoryDate.getTime() ||
          left.id.localeCompare(right.id),
      )
      .map((vehicle) => vehicle.id);
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        request(context.app).get(`/api/vehicles?page=${page}&pageSize=10`).expect(200),
      ),
    );
    const pageIds = pages.flatMap((page) => page.body.data.map((item: { id: string }) => item.id));
    const pageFour = await request(context.app).get("/api/vehicles?page=4&pageSize=10").expect(200);

    expect(pages.map((page) => page.body.data.length)).toEqual([10, 10, 5]);
    expect(pageIds).toEqual(expectedIds);
    expect(new Set(pageIds).size).toBe(25);
    expect(pages.map((page) => page.body.meta.totalItems)).toEqual([25, 25, 25]);
    expect(pages.map((page) => page.body.meta.totalPages)).toEqual([3, 3, 3]);
    expect(pageFour.body).toMatchObject({
      data: [],
      meta: { page: 4, pageSize: 10, totalItems: 25, totalPages: 3 },
    });
  });

  test.each([
    ["minAgeDays=abc", "minAgeDays=abc"],
    ["minAgeDays is empty", "minAgeDays="],
    ["minAgeDays is negative", "minAgeDays=-1"],
    ["min age exceeds max age", "minAgeDays=10&maxAgeDays=5"],
    ["page is zero", "page=0"],
    ["pageSize exceeds limit", "pageSize=101"],
    ["aging is not boolean", "aging=yes"],
    ["unknown parameter", "extra=value"],
    ["repeated make parameter", "make=a&make=b"],
    ["dealership id is not a UUID", "dealershipId=not-a-uuid"],
  ])("returns the standard validation envelope when %s", async (_label, query) => {
    const requestId = `invalid-${query.replaceAll(/[^a-zA-Z0-9]/g, "-")}`;
    const response = await request(context.app)
      .get(`/api/vehicles?${query}`)
      .set("x-request-id", requestId)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId,
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(response.headers["x-request-id"]).toBe(requestId);
  });
});
