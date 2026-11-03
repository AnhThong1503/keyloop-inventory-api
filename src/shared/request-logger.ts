import type { RequestHandler } from "express";
import type pino from "pino";

export function requestLogger(logger: pino.Logger): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const path = request.originalUrl.split("?")[0];
      const fields = {
        requestId: response.locals.requestId as string,
        method: request.method,
        path,
        statusCode: response.statusCode,
        durationMs,
      };

      if (response.statusCode >= 500) {
        logger.error(fields, "http request");
      } else if (response.statusCode >= 400) {
        logger.warn(fields, "http request");
      } else if (request.method === "GET" && path === "/health") {
        logger.debug(fields, "http request");
      } else {
        logger.info(fields, "http request");
      }
    });

    next();
  };
}
