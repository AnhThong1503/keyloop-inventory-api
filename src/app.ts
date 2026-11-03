import express from "express";
import helmet from "helmet";
import type pino from "pino";
import { createHealthRouter, type HealthPrismaClient } from "./modules/health/health.routes.ts";
import type { Clock } from "./shared/clock.ts";
import { errorHandler, notFoundHandler } from "./shared/error-handler.ts";
import { requestIdMiddleware } from "./shared/request-id.ts";
import { requestLogger } from "./shared/request-logger.ts";

export interface AppDependencies {
  prisma: HealthPrismaClient;
  clock: Clock;
  logger: pino.Logger;
}

export function createApp({ prisma, clock, logger }: AppDependencies): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10kb" }));
  app.use(requestLogger(logger));
  app.use("/health", createHealthRouter({ prisma, clock }));
  // Mount vehicle routes under /api in the vehicle-list checkpoint.
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
