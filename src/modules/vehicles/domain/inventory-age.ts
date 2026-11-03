const MILLISECONDS_PER_UTC_DAY = 86_400_000;

export const AGING_THRESHOLD_DAYS = 90;

export function toUtcDayNumber(date: Date): number {
  return Math.floor(date.getTime() / MILLISECONDS_PER_UTC_DAY);
}

export function dateFromUtcDayNumber(day: number): Date {
  return new Date(day * MILLISECONDS_PER_UTC_DAY);
}

export function calculateAgeInDays(inventoryDate: Date, now: Date): number {
  return Math.max(0, toUtcDayNumber(now) - toUtcDayNumber(inventoryDate));
}

export function isAgingStock(ageInDays: number): boolean {
  return ageInDays > AGING_THRESHOLD_DAYS;
}

export function resolveAgeRange(filters: {
  aging?: boolean;
  minAgeDays?: number;
  maxAgeDays?: number;
}): { min: number; max: number | null } | null {
  let min = filters.minAgeDays ?? 0;
  let max = filters.maxAgeDays ?? null;

  if (filters.aging === true) {
    min = Math.max(min, AGING_THRESHOLD_DAYS + 1);
  } else if (filters.aging === false) {
    max = max === null ? AGING_THRESHOLD_DAYS : Math.min(max, AGING_THRESHOLD_DAYS);
  }

  if (max !== null && min > max) {
    return null;
  }

  return { min, max };
}

export function inventoryDateBounds(
  range: { min: number; max: number | null },
  now: Date,
): { onOrBefore: Date | null; onOrAfter: Date | null } {
  const today = toUtcDayNumber(now);

  return {
    onOrBefore: range.min > 0 ? dateFromUtcDayNumber(today - range.min) : null,
    onOrAfter: range.max !== null ? dateFromUtcDayNumber(today - range.max) : null,
  };
}
