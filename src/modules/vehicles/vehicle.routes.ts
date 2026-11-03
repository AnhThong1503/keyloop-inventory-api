import { Router } from "express";
import { createListVehiclesController } from "./vehicle.controller.ts";
import type { VehicleService } from "./vehicle.service.ts";

export function createVehicleRouter(dependencies: { service: VehicleService }): Router {
  const router = Router();
  router.get("/vehicles", createListVehiclesController(dependencies.service));
  return router;
}
