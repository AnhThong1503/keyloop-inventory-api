import type { RequestHandler } from "express";
import {
  listVehiclesQuerySchema,
  updateActionBodySchema,
  vehicleIdParamSchema,
} from "./vehicle.schemas.ts";
import type { VehicleService } from "./vehicle.service.ts";
import { validate } from "../../shared/validate.ts";

export function createListVehiclesController(service: VehicleService): RequestHandler {
  return async (request, response) => {
    const { query } = validate(request, { query: listVehiclesQuerySchema });
    response.status(200).json(await service.listVehicles(query));
  };
}

export function createGetVehicleController(service: VehicleService): RequestHandler {
  return async (request, response) => {
    const { params } = validate(request, { params: vehicleIdParamSchema });
    response.status(200).json({ data: await service.getVehicle(params.id) });
  };
}

export function createUpdateVehicleActionController(service: VehicleService): RequestHandler {
  return async (request, response) => {
    const { params, body } = validate(request, {
      params: vehicleIdParamSchema,
      body: updateActionBodySchema,
    });
    response.status(200).json({ data: await service.updateVehicleAction(params.id, body) });
  };
}
