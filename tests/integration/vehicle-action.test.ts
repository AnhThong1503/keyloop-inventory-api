import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import { ProposedAction } from "../../src/generated/prisma/enums.ts";
import {
  buildTestApp,
  createDealership,
  createVehicle,
  FIXED_NOW_ISO,
  resetDatabase,
} from "../helpers/test-database.ts";

const fixedNow = new Date(FIXED_NOW_ISO);
const proposedActions = [
  ProposedAction.NONE,
  ProposedAction.UNDER_REVIEW,
  ProposedAction.PRICE_REDUCTION_PLANNED,
  ProposedAction.PROMOTION_PLANNED,
  ProposedAction.TRANSFER_PLANNED,
  ProposedAction.WHOLESALE_PLANNED,
];

describe("PATCH /api/vehicles/:id/action", () => {
  const context = buildTestApp({ nowIso: FIXED_NOW_ISO });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  async function createTestVehicle(ageInDays = 45) {
    const dealership = await createDealership(context.prisma);
    const vehicle = await createVehicle(
      context.prisma,
      { ageInDays, dealershipId: dealership.id },
      fixedNow,
    );
    return { dealership, vehicle };
  }

  test("persists the action and returns it from PATCH, GET, list, and Prisma", async () => {
    const { vehicle } = await createTestVehicle(45);
    const body = { action: ProposedAction.PRICE_REDUCTION_PLANNED, note: "Reduce by five percent" };

    const patch = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send(body)
      .expect(200);
    const detail = await request(context.app).get(`/api/vehicles/${vehicle.id}`).expect(200);
    const list = await request(context.app).get("/api/vehicles").expect(200);
    const listedVehicle = list.body.data.find((item: { id: string }) => item.id === vehicle.id);
    const stored = await context.prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      select: { proposedAction: true, actionNote: true, actionUpdatedAt: true },
    });

    const expectedAction = {
      proposedAction: ProposedAction.PRICE_REDUCTION_PLANNED,
      actionNote: "Reduce by five percent",
      actionUpdatedAt: FIXED_NOW_ISO,
    };
    expect(patch.body.data).toMatchObject(expectedAction);
    expect(detail.body.data).toMatchObject(expectedAction);
    expect(listedVehicle).toMatchObject(expectedAction);
    expect(stored).toMatchObject({
      proposedAction: ProposedAction.PRICE_REDUCTION_PLANNED,
      actionNote: "Reduce by five percent",
      actionUpdatedAt: fixedNow,
    });
    expect(stored?.actionUpdatedAt?.toISOString()).toBe(FIXED_NOW_ISO);
  });

  test("replaces the action and clears the note when omitted; NONE clears the plan", async () => {
    const { vehicle } = await createTestVehicle();
    await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send({ action: ProposedAction.PROMOTION_PLANNED, note: "Old note" })
      .expect(200);

    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send({ action: ProposedAction.NONE })
      .expect(200);
    const stored = await context.prisma.vehicle.findUnique({ where: { id: vehicle.id } });

    expect(response.body.data).toMatchObject({
      proposedAction: ProposedAction.NONE,
      actionNote: null,
    });
    expect(stored).toMatchObject({
      proposedAction: ProposedAction.NONE,
      actionNote: null,
      actionUpdatedAt: fixedNow,
    });
  });

  test.each(proposedActions)("accepts the action value %s", async (action) => {
    const { vehicle } = await createTestVehicle();

    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send({ action })
      .expect(200);

    expect(response.body.data.proposedAction).toBe(action);
  });

  test.each([45, 91])("allows an action for a vehicle aged %i days", async (ageInDays) => {
    const { vehicle } = await createTestVehicle(ageInDays);

    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send({ action: ProposedAction.UNDER_REVIEW })
      .expect(200);

    expect(response.body.data).toMatchObject({
      ageInDays,
      isAgingStock: ageInDays > 90,
      proposedAction: ProposedAction.UNDER_REVIEW,
    });
  });

  test("returns the same response for a repeated identical patch", async () => {
    const { vehicle } = await createTestVehicle();
    const body = {
      action: ProposedAction.TRANSFER_PLANNED,
      note: "Move to another dealership",
    };

    const first = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send(body)
      .expect(200);
    const second = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send(body)
      .expect(200);

    expect(second.body).toEqual(first.body);
  });

  test.each([
    ["invalid action value", { action: "NOT_AN_ACTION" }],
    ["missing action", { note: "note without action" }],
    ["empty object", {}],
    ["note longer than 500 characters", { action: ProposedAction.NONE, note: "x".repeat(501) }],
    ["unknown field", { action: ProposedAction.NONE, extra: true }],
    ["non-string note", { action: ProposedAction.NONE, note: 123 }],
  ])("returns VALIDATION_ERROR for %s", async (_label, body) => {
    const { vehicle } = await createTestVehicle();
    const requestId = `action-invalid-${_label.replaceAll(" ", "-")}`;
    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .set("x-request-id", requestId)
      .send(body)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId,
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  test("returns VALIDATION_ERROR when no body is sent", async () => {
    const { vehicle } = await createTestVehicle();
    const requestId = "action-no-body";
    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .set("x-request-id", requestId)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId,
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  test("returns VEHICLE_NOT_FOUND for a well-formed unknown id", async () => {
    const requestId = "action-unknown-id";
    const response = await request(context.app)
      .patch("/api/vehicles/9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f/action")
      .set("x-request-id", requestId)
      .send({ action: ProposedAction.NONE })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: "VEHICLE_NOT_FOUND",
      requestId,
    });
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  test("returns VALIDATION_ERROR for a malformed id", async () => {
    const requestId = "action-malformed-id";
    const response = await request(context.app)
      .patch("/api/vehicles/abc/action")
      .set("x-request-id", requestId)
      .send({ action: ProposedAction.NONE })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId,
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  test("returns INVALID_JSON for a malformed JSON body", async () => {
    const { vehicle } = await createTestVehicle();
    const requestId = "action-invalid-json";
    const response = await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .set("content-type", "application/json")
      .set("x-request-id", requestId)
      .send("{bad")
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "INVALID_JSON",
      requestId,
    });
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  test("a rejected patch leaves the database row unchanged", async () => {
    const { vehicle } = await createTestVehicle();

    await request(context.app)
      .patch(`/api/vehicles/${vehicle.id}/action`)
      .send({ action: "INVALID_ACTION" })
      .expect(400);

    const stored = await context.prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(stored).toMatchObject({
      proposedAction: ProposedAction.NONE,
      actionNote: null,
      actionUpdatedAt: null,
    });
  });
});
