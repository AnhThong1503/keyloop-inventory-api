import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import {
  AppError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  type ErrorDetail,
} from "./errors.ts";
import type pino from "pino";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDatabaseNotReachable(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "P2010" || !isRecord(error.meta)) {
    return false;
  }

  const adapterError = error.meta.driverAdapterError;
  if (!isRecord(adapterError) || !isRecord(adapterError.cause)) {
    return false;
  }

  return adapterError.cause.kind === "DatabaseNotReachable";
}

function errorDetailsFromZod(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    location: "body",
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

function mappedError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new ValidationError(errorDetailsFromZod(error));
  }
  if (isRecord(error) && error.type === "entity.parse.failed") {
    return new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }
  if (isRecord(error) && error.type === "entity.too.large") {
    return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 10kb limit");
  }
  if (isRecord(error) && error.code === "P2025") {
    return new NotFoundError("VEHICLE_NOT_FOUND", "Vehicle not found");
  }
  if (isDatabaseNotReachable(error)) {
    return new ServiceUnavailableError();
  }

  return new AppError(500, "INTERNAL_ERROR", "Internal server error");
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new NotFoundError("ROUTE_NOT_FOUND", "Route not found"));
};

export function errorHandler(logger: pino.Logger): ErrorRequestHandler {
  return (error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const mapped = mappedError(error);
    const requestId = response.locals.requestId as string | undefined;
    if (mapped.status >= 500) {
      logger.error(
        {
          requestId,
          errorType: error instanceof Error ? error.name : "UnknownError",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "request failed",
      );
    } else {
      logger.warn({ requestId, code: mapped.code, statusCode: mapped.status }, "request rejected");
    }

    response.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
        requestId,
      },
    });
  };
}
