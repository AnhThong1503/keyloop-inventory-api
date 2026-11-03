import express from "express";
import helmet from "helmet";
import type pino from "pino";
import { createHealthRouter, type HealthPrismaClient } from "./modules/health/health.routes.ts";
import {
  createVehicleRepository,
  type PrismaVehicleClient,
  type VehicleRepository,
} from "./modules/vehicles/vehicle.repository.ts";
import { createVehicleRouter } from "./modules/vehicles/vehicle.routes.ts";
import { createVehicleService } from "./modules/vehicles/vehicle.service.ts";
import type { Clock } from "./shared/clock.ts";
import { errorHandler, notFoundHandler } from "./shared/error-handler.ts";
import { requestIdMiddleware } from "./shared/request-id.ts";
import { requestLogger } from "./shared/request-logger.ts";

export interface AppDependencies {
  prisma: HealthPrismaClient;
  clock: Clock;
  logger: pino.Logger;
  vehicleRepository?: VehicleRepository;
}

function isVehicleDatabase(
  prisma: HealthPrismaClient,
): prisma is HealthPrismaClient & PrismaVehicleClient {
  if (!("vehicle" in prisma) || !("$transaction" in prisma)) {
    return false;
  }

  return (
    typeof prisma.$transaction === "function" &&
    typeof prisma.vehicle === "object" &&
    prisma.vehicle !== null &&
    "findMany" in prisma.vehicle &&
    typeof prisma.vehicle.findMany === "function" &&
    "count" in prisma.vehicle &&
    typeof prisma.vehicle.count === "function"
  );
}

export function createApp({
  prisma,
  clock,
  logger,
  vehicleRepository,
}: AppDependencies): express.Express {
  const app = express();
  const repository =
    vehicleRepository ??
    (isVehicleDatabase(prisma)
      ? createVehicleRepository(prisma)
      : (() => {
          throw new Error("A vehicle repository or Prisma vehicle client is required.");
        })());
  const vehicleService = createVehicleService({
    repository,
    clock,
  });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10kb" }));
  app.use(requestLogger(logger));
  app.use("/health", createHealthRouter({ prisma, clock }));
  app.use("/api", createVehicleRouter({ service: vehicleService }));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
