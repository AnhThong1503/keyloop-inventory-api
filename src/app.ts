import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import helmet from "helmet";
import { apiReference } from "@scalar/express-api-reference";
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

const defaultSecurityHeaders = helmet();
function documentationSecurityHeaders(nonce: string) {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", `'nonce-${nonce}'`],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });
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
  app.use((request, response, next) => {
    if (request.path !== "/docs" && request.path !== "/docs/") {
      defaultSecurityHeaders(request, response, next);
      return;
    }

    const nonce = randomBytes(16).toString("base64");
    response.locals.scalarCspNonce = nonce;
    documentationSecurityHeaders(nonce)(request, response, next);
  });
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10kb" }));
  app.use(requestLogger(logger));
  app.use("/health", createHealthRouter({ prisma, clock }));
  app.use("/api", createVehicleRouter({ service: vehicleService }));
  app.get("/openapi.yaml", async (_request, response) => {
    const specification = await readFile(new URL("../docs/openapi.yaml", import.meta.url), "utf8");
    response.type("application/yaml").send(specification);
  });
  app.get(["/docs", "/docs/"], (request, response, next) => {
    const nonce = response.locals.scalarCspNonce;
    if (typeof nonce !== "string") {
      next(new Error("Scalar CSP nonce is unavailable."));
      return;
    }

    const scalarHandler = apiReference({
      url: "/openapi.yaml",
      theme: "purple",
      nonce,
    });

    // Scalar's handler typing excludes Express's normal route-parameter type.
    scalarHandler(request as never, response, next);
  });
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
