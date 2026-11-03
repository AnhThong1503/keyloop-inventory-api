import "dotenv/config";
import { ProposedAction } from "../src/generated/prisma/enums.ts";
import { createPrismaClient } from "../src/db/prisma.ts";

const dealershipSeeds = [
  { id: "a0000000-0000-4000-8000-000000000001", name: "Downtown Motors" },
  { id: "a0000000-0000-4000-8000-000000000002", name: "Riverside Auto Group" },
] as const;

const vehicleSeeds = [
  {
    make: "Kia",
    model: "Sportage",
    year: 2021,
    colour: "Green",
    dealership: 2,
    days: 0,
    action: ProposedAction.NONE,
  },
  {
    make: "Toyota",
    model: "Corolla",
    year: 2024,
    colour: "Pearl White",
    dealership: 1,
    days: 12,
    action: ProposedAction.NONE,
  },
  {
    make: "Mazda",
    model: "CX-5",
    year: 2023,
    colour: "Soul Red",
    dealership: 2,
    days: 30,
    action: ProposedAction.NONE,
  },
  {
    make: "Toyota",
    model: "Corolla",
    year: 2023,
    colour: "Graphite Grey",
    dealership: 1,
    days: 45,
    action: ProposedAction.NONE,
  },
  {
    make: "BMW",
    model: "3 Series",
    year: 2022,
    colour: "Black",
    dealership: 1,
    days: 60,
    action: ProposedAction.NONE,
  },
  {
    make: "Ford",
    model: "Kuga",
    year: 2022,
    colour: "Black",
    dealership: 2,
    days: 75,
    action: ProposedAction.NONE,
  },
  {
    make: "Toyota",
    model: "RAV4",
    year: 2023,
    colour: "Midnight Blue",
    dealership: 1,
    days: 89,
    action: ProposedAction.NONE,
  },
  {
    make: "Honda",
    model: "Civic",
    year: 2022,
    colour: "Rallye Red",
    dealership: 1,
    days: 90,
    action: ProposedAction.NONE,
  },
  {
    make: "Honda",
    model: "CR-V",
    year: 2022,
    colour: "Silver",
    dealership: 1,
    days: 91,
    action: ProposedAction.UNDER_REVIEW,
  },
  {
    make: "Hyundai",
    model: "Tucson",
    year: 2022,
    colour: "White",
    dealership: 1,
    days: 92,
    action: ProposedAction.NONE,
  },
  {
    make: "Ford",
    model: "Focus",
    year: 2021,
    colour: "Blue",
    dealership: 2,
    days: 120,
    action: ProposedAction.PRICE_REDUCTION_PLANNED,
    note: "Reduce asking price by 5% from Monday",
  },
  {
    make: "Volkswagen",
    model: "Golf",
    year: 2021,
    colour: "White",
    dealership: 2,
    days: 150,
    action: ProposedAction.PROMOTION_PLANNED,
  },
  {
    make: "Volkswagen",
    model: "Tiguan",
    year: 2020,
    colour: "Grey",
    dealership: 2,
    days: 210,
    action: ProposedAction.WHOLESALE_PLANNED,
  },
  {
    make: "BMW",
    model: "X1",
    year: 2021,
    colour: "Blue",
    dealership: 1,
    days: 365,
    action: ProposedAction.TRANSFER_PLANNED,
  },
] as const;

function inventoryDateDaysAgo(now: Date, days: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to seed the development database.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  for (const dealership of dealershipSeeds) {
    await prisma.dealership.upsert({
      where: { name: dealership.name },
      create: dealership,
      update: { id: dealership.id, name: dealership.name },
    });
  }

  const now = new Date();
  const seededRows = [];
  for (const [index, vehicle] of vehicleSeeds.entries()) {
    const id = `b0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const vin = `KLP2026A${String(index + 1).padStart(9, "0")}`;
    const inventoryDate = inventoryDateDaysAgo(now, vehicle.days);
    const actionNote = "note" in vehicle ? vehicle.note : null;
    const actionUpdatedAt = vehicle.action === ProposedAction.NONE ? null : now;
    const data = {
      id,
      vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      colour: vehicle.colour,
      dealershipId: dealershipSeeds[vehicle.dealership - 1].id,
      inventoryDate,
      proposedAction: vehicle.action,
      actionNote,
      actionUpdatedAt,
    };

    await prisma.vehicle.upsert({
      where: { vin },
      create: data,
      update: data,
    });

    seededRows.push({
      vin,
      make: vehicle.make,
      model: vehicle.model,
      inventoryDate: inventoryDate.toISOString().slice(0, 10),
      daysInInventory: vehicle.days,
      proposedAction: vehicle.action,
    });
  }

  console.table(seededRows);
  console.log("Seeded 2 dealerships and 14 vehicles.");
} finally {
  await prisma.$disconnect();
}
