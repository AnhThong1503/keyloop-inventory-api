import {
  AGING_THRESHOLD_DAYS,
  inventoryDateBounds,
  resolveAgeRange,
} from "./domain/inventory-age.ts";
import type { Clock } from "../../shared/clock.ts";
import type { ListVehiclesQuery } from "./vehicle.schemas.ts";
import type { VehicleRepository } from "./vehicle.repository.ts";
import { toVehicleDto } from "./vehicle.mapper.ts";
import { NotFoundError } from "../../shared/errors.ts";

export function createVehicleService(dependencies: {
  repository: VehicleRepository;
  clock: Clock;
}) {
  return {
    async listVehicles(query: ListVehiclesQuery) {
      const now = dependencies.clock.now();
      const range = resolveAgeRange(query);
      const asOfDate = now.toISOString().slice(0, 10);
      const emptyPage = {
        data: [],
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: 0,
          totalPages: 0,
          asOfDate,
          agingThresholdDays: AGING_THRESHOLD_DAYS,
        },
      };

      if (!range) {
        return emptyPage;
      }

      const bounds = inventoryDateBounds(range, now);
      const result = await dependencies.repository.findVehicles({
        make: query.make,
        model: query.model,
        dealershipId: query.dealershipId,
        ...bounds,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });

      return {
        data: result.items.map((item) => toVehicleDto(item, now)),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.pageSize),
          asOfDate,
          agingThresholdDays: AGING_THRESHOLD_DAYS,
        },
      };
    },
    async getVehicle(id: string) {
      const record = await dependencies.repository.findVehicleById(id);
      if (!record) {
        throw new NotFoundError("VEHICLE_NOT_FOUND", `Vehicle ${id} was not found.`);
      }

      return toVehicleDto(record, dependencies.clock.now());
    },
  };
}

export type VehicleService = ReturnType<typeof createVehicleService>;
