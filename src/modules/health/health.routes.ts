import { Router } from "express";
import type { Clock } from "../../shared/clock.ts";

export interface HealthPrismaClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

async function checkDatabase(prisma: HealthPrismaClient): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Database health check timed out")), 2000);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function createHealthRouter(dependencies: {
  prisma: HealthPrismaClient;
  clock: Clock;
}): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    const databaseIsUp = await checkDatabase(dependencies.prisma);

    response.status(databaseIsUp ? 200 : 503).json({
      status: databaseIsUp ? "ok" : "degraded",
      checks: { database: databaseIsUp ? "up" : "down" },
      uptimeSeconds: process.uptime(),
      timestamp: dependencies.clock.now().toISOString(),
    });
  });

  return router;
}
