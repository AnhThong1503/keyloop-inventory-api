import express from "express";
import { describe, expect, test } from "vitest";
import request from "supertest";
import { ZodError, z } from "zod";
import { errorHandler, notFoundHandler } from "../../src/shared/error-handler.ts";
import {
  AppError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "../../src/shared/errors.ts";
import { requestIdMiddleware } from "../../src/shared/request-id.ts";
import { createLoggerMock } from "./logger-mock.ts";

function errorApp(error: unknown) {
  const app = express();
  const logger = createLoggerMock();
  app.use(requestIdMiddleware);
  app.get("/error", (_request, _response, next) => next(error));
  app.use(errorHandler(logger));
  return { app, logger };
}

function zodError(): ZodError {
  try {
    z.uuid().parse("not-a-uuid");
  } catch (error) {
    if (error instanceof ZodError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected Zod parsing to fail");
}

describe("errorHandler", () => {
  test.each([
    ["application error", new AppError(409, "CONFLICT", "Conflict"), 409, "CONFLICT"],
    ["validation error", new ValidationError([]), 400, "VALIDATION_ERROR"],
    ["not found error", new NotFoundError("CUSTOM_NOT_FOUND"), 404, "CUSTOM_NOT_FOUND"],
    ["service unavailable error", new ServiceUnavailableError(), 503, "SERVICE_UNAVAILABLE"],
    ["Zod error", zodError(), 400, "VALIDATION_ERROR"],
    [
      "invalid JSON parser error",
      { type: "entity.parse.failed", message: "do not expose body parser internals" },
      400,
      "INVALID_JSON",
    ],
    [
      "oversized body parser error",
      { type: "entity.too.large", message: "do not expose parser details" },
      413,
      "PAYLOAD_TOO_LARGE",
    ],
    ["Prisma missing record error", { code: "P2025" }, 404, "VEHICLE_NOT_FOUND"],
    [
      "observed database connectivity error",
      {
        code: "P2010",
        meta: { driverAdapterError: { cause: { kind: "DatabaseNotReachable" } } },
      },
      503,
      "SERVICE_UNAVAILABLE",
    ],
    [
      "unobserved driver error",
      { code: "P2010", meta: { driverAdapterError: { cause: { kind: "Other" } } } },
      500,
      "INTERNAL_ERROR",
    ],
  ])("maps %s", async (_name, error, status, code) => {
    const { app } = errorApp(error);
    const response = await request(app).get("/error").expect(status);
    expect(response.body.error.code).toBe(code);
    expect(response.body.error.requestId).toBe(response.headers["x-request-id"]);
  });

  test("uses a generic 500 message and logs only server-side stack data", async () => {
    const privateMessage = "private driver message must not reach the client";
    const { app, logger } = errorApp(new Error(privateMessage));
    const response = await request(app).get("/error").expect(500);

    expect(response.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    });
    expect(JSON.stringify(response.body)).not.toContain(privateMessage);
    expect(JSON.stringify(response.body)).not.toContain("stack");
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ stack: expect.stringContaining("Error") }),
      "request failed",
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("logs client errors at warn without a stack", async () => {
    const { app, logger } = errorApp(new NotFoundError("NOT_FOUND"));
    await request(app).get("/error").expect(404);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NOT_FOUND", statusCode: 404 }),
      "request rejected",
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("notFoundHandler creates the route-not-found envelope", async () => {
    const logger = createLoggerMock();
    const app = express();
    app.use(requestIdMiddleware);
    app.use(notFoundHandler);
    app.use(errorHandler(logger));

    const response = await request(app).get("/missing").expect(404);
    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      requestId: response.headers["x-request-id"],
    });
  });
});
