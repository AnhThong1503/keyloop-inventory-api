import { Router } from "express";
import {
  createGetVehicleController,
  createListVehiclesController,
  createUpdateVehicleActionController,
} from "./vehicle.controller.ts";
import type { VehicleService } from "./vehicle.service.ts";

export function createVehicleRouter(dependencies: { service: VehicleService }): Router {
  const router = Router();
  router.get("/vehicles", createListVehiclesController(dependencies.service));
  router.get("/vehicles/:id", createGetVehicleController(dependencies.service));
  router.patch("/vehicles/:id/action", createUpdateVehicleActionController(dependencies.service));
  return router;
}
