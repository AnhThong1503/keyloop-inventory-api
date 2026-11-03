import { calculateAgeInDays, isAgingStock } from "./domain/inventory-age.ts";
import type { VehicleRecord } from "./vehicle.repository.ts";

export interface VehicleDto {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  inventoryDate: string;
  ageInDays: number;
  isAgingStock: boolean;
  proposedAction: string;
  actionNote: string | null;
  actionUpdatedAt: string | null;
  dealership: { id: string; name: string };
}

export function toVehicleDto(record: VehicleRecord, now: Date): VehicleDto {
  const ageInDays = calculateAgeInDays(record.inventoryDate, now);

  return {
    id: record.id,
    vin: record.vin,
    make: record.make,
    model: record.model,
    year: record.year,
    colour: record.colour,
    inventoryDate: record.inventoryDate.toISOString().slice(0, 10),
    ageInDays,
    isAgingStock: isAgingStock(ageInDays),
    proposedAction: record.proposedAction,
    actionNote: record.actionNote,
    actionUpdatedAt: record.actionUpdatedAt?.toISOString() ?? null,
    dealership: record.dealership,
  };
}
