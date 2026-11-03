import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app.ts";
import { createPrismaClient } from "../../src/db/prisma.ts";
import { createVehicleRepository } from "../../src/modules/vehicles/vehicle.repository.ts";
import {
  dateFromUtcDayNumber,
  toUtcDayNumber,
} from "../../src/modules/vehicles/domain/inventory-age.ts";
import type { ProposedAction } from "../../src/generated/prisma/enums.ts";
import type { PrismaClient } from "../../src/generated/prisma/client.ts";
import { createLogger } from "../../src/shared/logger.ts";
import type { Clock } from "../../src/shared/clock.ts";

export const FIXED_NOW_ISO = "2026-10-29T12:00:00.000Z";

export function fixedClock(iso: string): Clock {
  const timestamp = new Date(iso);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("fixedClock requires a valid ISO date.");
  }
  return { now: () => new Date(timestamp) };
}

export function buildTestApp({ nowIso }: { nowIso: string }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set to the isolated test database.");
  }

  const prisma = createPrismaClient(databaseUrl);
  const clock = fixedClock(nowIso);
  const app = createApp({
    prisma,
    clock,
    logger: createLogger("silent", "test"),
    vehicleRepository: createVehicleRepository(prisma),
  });

  return { app, prisma, clock };
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.vehicle.deleteMany();
  await prisma.dealership.deleteMany();
}

export async function createDealership(
  prisma: PrismaClient,
  name = `Test dealership ${randomUUID()}`,
): Promise<{ id: string; name: string }> {
  return prisma.dealership.create({
    data: { name },
    select: { id: true, name: true },
  });
}

export interface CreateVehicleInput {
  ageInDays: number;
  dealershipId?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  colour?: string;
  proposedAction?: ProposedAction;
  actionNote?: string | null;
  actionUpdatedAt?: Date | null;
}

export async function createVehicle(prisma: PrismaClient, input: CreateVehicleInput, now: Date) {
  const inventoryDate = dateFromUtcDayNumber(toUtcDayNumber(now) - input.ageInDays);
  const dealershipId = input.dealershipId ?? (await createDealership(prisma)).id;

  return prisma.vehicle.create({
    data: {
      vin: input.vin ?? `TEST${randomUUID().replaceAll("-", "").slice(0, 13)}`,
      make: input.make ?? "Toyota",
      model: input.model ?? "Camry",
      year: input.year ?? 2024,
      colour: input.colour ?? "Blue",
      inventoryDate,
      dealershipId,
      ...(input.proposedAction ? { proposedAction: input.proposedAction } : {}),
      ...(input.actionNote !== undefined ? { actionNote: input.actionNote } : {}),
      ...(input.actionUpdatedAt !== undefined ? { actionUpdatedAt: input.actionUpdatedAt } : {}),
    },
  });
}
