import { describe, expect, test, vi } from "vitest";
import {
  dateFromUtcDayNumber,
  toUtcDayNumber,
} from "../../src/modules/vehicles/domain/inventory-age.ts";
import { toVehicleDto } from "../../src/modules/vehicles/vehicle.mapper.ts";
import type {
  VehicleRecord,
  VehicleRepository,
} from "../../src/modules/vehicles/vehicle.repository.ts";
import { createVehicleService } from "../../src/modules/vehicles/vehicle.service.ts";
import { listVehiclesQuerySchema } from "../../src/modules/vehicles/vehicle.schemas.ts";
import { updateActionBodySchema } from "../../src/modules/vehicles/vehicle.schemas.ts";
import type { Clock } from "../../src/shared/clock.ts";

const fixedNow = new Date("2026-10-29T12:00:00.000Z");
const clock: Clock = { now: () => new Date(fixedNow) };

function createRepository(total = 0, items: VehicleRecord[] = []) {
  const findVehicles = vi.fn<VehicleRepository["findVehicles"]>(async () => ({ items, total }));
  const findVehicleById = vi.fn<VehicleRepository["findVehicleById"]>(async () => null);
  const updateVehicleAction = vi.fn<VehicleRepository["updateVehicleAction"]>(
    async (id, input) => ({ ...vehicleAtAge(0), id, ...input }),
  );
  const repository: VehicleRepository = {
    findVehicles,
    findVehicleById,
    updateVehicleAction,
  };
  return { repository, findVehicles, findVehicleById, updateVehicleAction };
}

function listQuery(query: Record<string, string>) {
  return listVehiclesQuerySchema.parse(query);
}

function vehicleAtAge(ageInDays: number): VehicleRecord {
  return {
    id: `vehicle-${ageInDays}`,
    vin: `VIN${ageInDays}`,
    make: "Toyota",
    model: "Camry",
    year: 2024,
    colour: "Blue",
    inventoryDate: dateFromUtcDayNumber(toUtcDayNumber(fixedNow) - ageInDays),
    proposedAction: "NONE",
    actionNote: null,
    actionUpdatedAt: null,
    dealership: { id: "dealer-1", name: "Dealer" },
  };
}

describe("vehicle list service", () => {
  test.each([
    ["aging=true", { aging: "true" }, "2026-07-30", null],
    ["aging=false", { aging: "false" }, null, "2026-07-31"],
    ["minimum only", { minAgeDays: "5" }, "2026-10-24", null],
    ["maximum only", { maxAgeDays: "40" }, null, "2026-09-19"],
    ["both bounds", { minAgeDays: "20", maxAgeDays: "40" }, "2026-10-09", "2026-09-19"],
  ])("passes computed repository bounds for %s", async (_label, query, before, after) => {
    const { repository, findVehicles } = createRepository();
    const service = createVehicleService({ repository, clock });

    await service.listVehicles(listQuery(query));

    const input = findVehicles.mock.calls[0]?.[0];
    expect(input?.onOrBefore?.toISOString().slice(0, 10) ?? null).toBe(before);
    expect(input?.onOrAfter?.toISOString().slice(0, 10) ?? null).toBe(after);
  });

  test("returns an empty page without querying when age filters contradict", async () => {
    const { repository, findVehicles } = createRepository();
    const service = createVehicleService({ repository, clock });

    const result = await service.listVehicles(
      listQuery({ aging: "true", maxAgeDays: "50", page: "2", pageSize: "10" }),
    );

    expect(findVehicles).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      meta: {
        page: 2,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        asOfDate: "2026-10-29",
        agingThresholdDays: 90,
      },
    });
  });

  test("calculates page totals and repository offset", async () => {
    const { repository, findVehicles } = createRepository(25);
    const service = createVehicleService({ repository, clock });

    const result = await service.listVehicles(listQuery({ page: "3", pageSize: "10" }));

    expect(findVehicles).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
    expect(result.meta).toMatchObject({
      page: 3,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
      asOfDate: "2026-10-29",
      agingThresholdDays: 90,
    });
  });

  test("sets totalPages to zero when the repository returns no matches", async () => {
    const { repository } = createRepository();
    const service = createVehicleService({ repository, clock });

    const result = await service.listVehicles(listQuery({}));

    expect(result.meta.totalPages).toBe(0);
    expect(result.meta.totalItems).toBe(0);
  });
});

describe("toVehicleDto", () => {
  test.each([0, 89, 90, 91])("maps age %i with only public vehicle fields", (age) => {
    const dto = toVehicleDto(vehicleAtAge(age), fixedNow);

    expect(dto.ageInDays).toBe(age);
    expect(dto.isAgingStock).toBe(age > 90);
    expect(dto.inventoryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dto.actionUpdatedAt).toBeNull();
    expect(Object.keys(dto)).toEqual([
      "id",
      "vin",
      "make",
      "model",
      "year",
      "colour",
      "inventoryDate",
      "ageInDays",
      "isAgingStock",
      "proposedAction",
      "actionNote",
      "actionUpdatedAt",
      "dealership",
    ]);
    expect(dto.dealership).toEqual({ id: "dealer-1", name: "Dealer" });
  });

  test("derives age and aging status from the inventory date on each read", () => {
    const record = vehicleAtAge(90);
    const firstRead = toVehicleDto(record, fixedNow);
    const nextDayRead = toVehicleDto(record, new Date("2026-10-30T12:00:00.000Z"));

    expect(firstRead).toMatchObject({ ageInDays: 90, isAgingStock: false });
    expect(nextDayRead).toMatchObject({ ageInDays: 91, isAgingStock: true });
    expect(record).not.toHaveProperty("ageInDays");
    expect(record).not.toHaveProperty("isAgingStock");
  });

  test("serializes actionUpdatedAt as ISO and does not add persistence fields", () => {
    const record = vehicleAtAge(0);
    record.actionUpdatedAt = new Date("2026-10-28T15:04:05.000Z");
    const dto = toVehicleDto(record, fixedNow);

    expect(dto.actionUpdatedAt).toBe("2026-10-28T15:04:05.000Z");
  });
});

describe("vehicle detail service", () => {
  test.each([89, 90, 91])("maps a vehicle aged %i days", async (ageInDays) => {
    const record = vehicleAtAge(ageInDays);
    const { repository, findVehicleById } = createRepository();
    findVehicleById.mockResolvedValue(record);
    const service = createVehicleService({ repository, clock });

    await expect(service.getVehicle(record.id)).resolves.toMatchObject({
      id: record.id,
      ageInDays,
      isAgingStock: ageInDays > 90,
    });
    expect(findVehicleById).toHaveBeenCalledWith(record.id);
  });

  test("throws VEHICLE_NOT_FOUND when the repository returns null", async () => {
    const { repository } = createRepository();
    const service = createVehicleService({ repository, clock });

    await expect(service.getVehicle("missing-id")).rejects.toMatchObject({
      code: "VEHICLE_NOT_FOUND",
      status: 404,
      message: "Vehicle missing-id was not found.",
    });
  });

  describe("vehicle action service", () => {
    test.each([
      ["omitted", undefined, null],
      ["null", null, null],
      ["blank", "   ", null],
      ["a note", "Reviewed by manager", "Reviewed by manager"],
    ])(
      "normalizes a %s note and timestamps the replacement",
      async (_label, note, expectedNote) => {
        const record = vehicleAtAge(45);
        const { repository, findVehicleById, updateVehicleAction } = createRepository();
        findVehicleById.mockResolvedValue(record);
        updateVehicleAction.mockImplementation(async (id, input) => ({ ...record, id, ...input }));
        const service = createVehicleService({ repository, clock });
        const rawBody =
          note === undefined
            ? { action: "PROMOTION_PLANNED" }
            : { action: "PROMOTION_PLANNED", note };
        const body = updateActionBodySchema.parse(rawBody);

        const result = await service.updateVehicleAction(record.id, body);

        expect(updateVehicleAction).toHaveBeenCalledWith(record.id, {
          proposedAction: "PROMOTION_PLANNED",
          actionNote: expectedNote,
          actionUpdatedAt: fixedNow,
        });
        expect(result).toMatchObject({
          id: record.id,
          ageInDays: 45,
          isAgingStock: false,
          proposedAction: "PROMOTION_PLANNED",
          actionNote: expectedNote,
          actionUpdatedAt: fixedNow.toISOString(),
        });
      },
    );

    test("does not restrict actions to aging vehicles", async () => {
      const record = vehicleAtAge(45);
      const { repository, findVehicleById, updateVehicleAction } = createRepository();
      findVehicleById.mockResolvedValue(record);
      updateVehicleAction.mockImplementation(async (id, input) => ({ ...record, id, ...input }));
      const service = createVehicleService({ repository, clock });

      await service.updateVehicleAction(
        record.id,
        updateActionBodySchema.parse({ action: "UNDER_REVIEW" }),
      );

      expect(updateVehicleAction).toHaveBeenCalledWith(
        record.id,
        expect.objectContaining({ proposedAction: "UNDER_REVIEW" }),
      );
    });

    test("throws VEHICLE_NOT_FOUND before attempting an update", async () => {
      const { repository, updateVehicleAction } = createRepository();
      const service = createVehicleService({ repository, clock });

      await expect(
        service.updateVehicleAction("missing-id", updateActionBodySchema.parse({ action: "NONE" })),
      ).rejects.toMatchObject({ code: "VEHICLE_NOT_FOUND", status: 404 });
      expect(updateVehicleAction).not.toHaveBeenCalled();
    });
  });
});
