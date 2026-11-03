import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { loadEnv } from "./config/env.ts";
import { createPrismaClient } from "./db/prisma.ts";
import { createLogger } from "./shared/logger.ts";
import { systemClock } from "./shared/clock.ts";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV);
const prisma = createPrismaClient(env.DATABASE_URL);
const app = createApp({ prisma, clock: systemClock, logger });
const databaseUrl = new URL(env.DATABASE_URL);
const server = createServer(app);

let shutdownStarted = false;

function flushLogger(): Promise<void> {
  return new Promise((resolve) => logger.flush(() => resolve()));
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shutdownStarted) {
    return;
  }
  shutdownStarted = true;

  logger.info({ signal }, "shutdown started");
  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out");
    logger.flush(() => process.exit(1));
  }, 10_000);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    logger.info("http server closed");
    await prisma.$disconnect();
    logger.info("database disconnected");
    await flushLogger();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    logger.error(
      {
        errorType: error instanceof Error ? error.name : "UnknownError",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "graceful shutdown failed",
    );
    await flushLogger();
    clearTimeout(forceExit);
    process.exit(1);
  }
}

function logFatalProcessError(error: unknown, event: string): void {
  logger.fatal(
    {
      errorType: error instanceof Error ? error.name : "UnknownError",
      stack: error instanceof Error ? error.stack : undefined,
    },
    event,
  );
  logger.flush(() => process.exit(1));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logFatalProcessError(reason, "unhandled rejection"));
process.on("uncaughtException", (error) => logFatalProcessError(error, "uncaught exception"));

server.listen(env.PORT, () => {
  logger.info(
    {
      environment: env.NODE_ENV,
      port: env.PORT,
      database: {
        host: databaseUrl.hostname,
        port: databaseUrl.port || "5432",
        name: databaseUrl.pathname.slice(1),
      },
    },
    "server listening",
  );
});
