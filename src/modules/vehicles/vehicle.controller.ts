import type { RequestHandler } from "express";
import { listVehiclesQuerySchema } from "./vehicle.schemas.ts";
import type { VehicleService } from "./vehicle.service.ts";
import { validate } from "../../shared/validate.ts";

export function createListVehiclesController(service: VehicleService): RequestHandler {
  return async (request, response) => {
    const { query } = validate(request, { query: listVehiclesQuerySchema });
    response.status(200).json(await service.listVehicles(query));
  };
}
