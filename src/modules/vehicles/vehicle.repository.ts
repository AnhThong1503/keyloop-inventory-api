import type { PrismaClient } from "../../generated/prisma/client.ts";

export interface FindVehiclesInput {
  make?: string;
  model?: string;
  dealershipId?: string;
  onOrBefore?: Date | null;
  onOrAfter?: Date | null;
  skip: number;
  take: number;
}

export interface VehicleRecord {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  inventoryDate: Date;
  proposedAction: string;
  actionNote: string | null;
  actionUpdatedAt: Date | null;
  dealership: { id: string; name: string };
}

export interface VehicleRepository {
  findVehicles(input: FindVehiclesInput): Promise<{
    items: VehicleRecord[];
    total: number;
  }>;
  findVehicleById(id: string): Promise<VehicleRecord | null>;
}

export type PrismaVehicleClient = Pick<PrismaClient, "vehicle" | "$transaction">;

export function createVehicleRepository(prisma: PrismaVehicleClient): VehicleRepository {
  return {
    async findVehicles(input) {
      const where = {
        ...(input.make ? { make: { equals: input.make, mode: "insensitive" as const } } : {}),
        ...(input.model ? { model: { equals: input.model, mode: "insensitive" as const } } : {}),
        ...(input.dealershipId ? { dealershipId: input.dealershipId } : {}),
        ...(input.onOrBefore || input.onOrAfter
          ? {
              inventoryDate: {
                ...(input.onOrBefore ? { lte: input.onOrBefore } : {}),
                ...(input.onOrAfter ? { gte: input.onOrAfter } : {}),
              },
            }
          : {}),
      };

      const [items, total] = await prisma.$transaction([
        prisma.vehicle.findMany({
          where,
          include: { dealership: { select: { id: true, name: true } } },
          orderBy: [{ inventoryDate: "asc" }, { id: "asc" }],
          skip: input.skip,
          take: input.take,
        }),
        prisma.vehicle.count({ where }),
      ]);

      return { items, total };
    },
    async findVehicleById(id) {
      return prisma.vehicle.findUnique({
        where: { id },
        include: { dealership: { select: { id: true, name: true } } },
      });
    },
  };
}
