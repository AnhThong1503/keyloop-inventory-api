import { describe, expect, test } from "vitest";
import { ProposedAction } from "../../src/generated/prisma/enums.ts";
import {
  listVehiclesQuerySchema,
  updateActionBodySchema,
  vehicleIdParamSchema,
} from "../../src/modules/vehicles/vehicle.schemas.ts";

describe("listVehiclesQuerySchema", () => {
  test("applies pagination defaults", () => {
    expect(listVehiclesQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });

  test("trims make and model and transforms query values", () => {
    expect(
      listVehiclesQuerySchema.parse({
        make: " Toyota ",
        model: " Corolla ",
        aging: "false",
        minAgeDays: "90",
        page: "2",
        pageSize: "50",
      }),
    ).toMatchObject({
      make: "Toyota",
      model: "Corolla",
      aging: false,
      minAgeDays: 90,
      page: 2,
      pageSize: 50,
    });
  });

  test.each([
    ["make", ""],
    ["make", "x".repeat(51)],
    ["model", ""],
    ["model", "x".repeat(51)],
  ])("rejects invalid %s value", (key, value) => {
    expect(listVehiclesQuerySchema.safeParse({ [key]: value }).success).toBe(false);
  });

  test("accepts a valid dealership UUID", () => {
    expect(
      listVehiclesQuerySchema.safeParse({ dealershipId: "a0000000-0000-4000-8000-000000000001" })
        .success,
    ).toBe(true);
  });

  test.each(Object.values(ProposedAction))("accepts action %s", (action) => {
    expect(updateActionBodySchema.parse({ action }).action).toBe(action);
  });

  test.each([
    [{ action: "under_review" }],
    [{ action: "" }],
    [{ action: 1 }],
    [{ action: null }],
    [{}],
  ])("rejects invalid action body %o", (body) => {
    expect(updateActionBodySchema.safeParse(body).success).toBe(false);
  });

  test("accepts a null note", () => {
    expect(updateActionBodySchema.parse({ action: ProposedAction.NONE, note: null }).note).toBe(
      null,
    );
  });

  test("allows an omitted note", () => {
    expect(updateActionBodySchema.parse({ action: ProposedAction.NONE })).toMatchObject({
      action: ProposedAction.NONE,
    });
  });

  test("turns a blank trimmed note into null", () => {
    expect(updateActionBodySchema.parse({ action: ProposedAction.NONE, note: "   " }).note).toBe(
      null,
    );
  });

  test("trims a nonblank note", () => {
    expect(
      updateActionBodySchema.parse({ action: ProposedAction.NONE, note: "  review  " }).note,
    ).toBe("review");
  });

  test("accepts a 500-character note", () => {
    expect(
      updateActionBodySchema.safeParse({ action: ProposedAction.NONE, note: "a".repeat(500) })
        .success,
    ).toBe(true);
  });

  test("rejects a note longer than 500 characters", () => {
    expect(
      updateActionBodySchema.safeParse({ action: ProposedAction.NONE, note: "a".repeat(501) })
        .success,
    ).toBe(false);
  });

  test("rejects unknown body fields", () => {
    expect(
      updateActionBodySchema.safeParse({ action: ProposedAction.NONE, unexpected: true }).success,
    ).toBe(false);
  });

  test("rejects unknown query fields", () => {
    expect(listVehiclesQuerySchema.safeParse({ unexpected: "value" }).success).toBe(false);
  });

  test.each([
    ["page zero", { page: "0" }],
    ["page decimal", { page: "1.5" }],
    ["pageSize above maximum", { pageSize: "101" }],
    ["pageSize empty", { pageSize: "" }],
  ])("rejects %s", (_case, query) => {
    expect(listVehiclesQuerySchema.safeParse(query).success).toBe(false);
  });

  test.each(["", "abc", "-1", "1e2", "36501", " 1"])(
    "rejects invalid minAgeDays value %j",
    (minAgeDays) => {
      expect(listVehiclesQuerySchema.safeParse({ minAgeDays }).success).toBe(false);
    },
  );

  test.each(["", "abc", "-1", "1e2", "36501"])(
    "rejects invalid maxAgeDays value %j",
    (maxAgeDays) => {
      expect(listVehiclesQuerySchema.safeParse({ maxAgeDays }).success).toBe(false);
    },
  );

  test("accepts inclusive minimum and maximum age bounds", () => {
    expect(listVehiclesQuerySchema.parse({ minAgeDays: "0", maxAgeDays: "36500" })).toMatchObject({
      minAgeDays: 0,
      maxAgeDays: 36500,
    });
  });

  test("rejects aging values other than true or false", () => {
    expect(listVehiclesQuerySchema.safeParse({ aging: "yes" }).success).toBe(false);
  });

  test.each([
    ["true", true],
    ["false", false],
  ])("parses aging=%s as %s", (aging, expected) => {
    expect(listVehiclesQuerySchema.parse({ aging }).aging).toBe(expected);
  });

  test("rejects minimum age greater than maximum age", () => {
    const result = listVehiclesQuerySchema.safeParse({ minAgeDays: "10", maxAgeDays: "5" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("minAgeDays");
    }
  });

  test("rejects malformed dealership UUIDs", () => {
    expect(listVehiclesQuerySchema.safeParse({ dealershipId: "not-a-uuid" }).success).toBe(false);
  });

  test("rejects malformed vehicle id UUIDs", () => {
    expect(vehicleIdParamSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });

  test("accepts a valid vehicle id UUID", () => {
    expect(
      vehicleIdParamSchema.safeParse({ id: "b0000000-0000-4000-8000-000000000001" }).success,
    ).toBe(true);
  });

  test("rejects repeated query values", () => {
    expect(listVehiclesQuerySchema.safeParse({ aging: ["true", "false"] }).success).toBe(false);
  });
});
