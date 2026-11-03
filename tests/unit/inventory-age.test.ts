import { describe, expect, test } from "vitest";
import {
  AGING_THRESHOLD_DAYS,
  calculateAgeInDays,
  dateFromUtcDayNumber,
  inventoryDateBounds,
  isAgingStock,
  resolveAgeRange,
  toUtcDayNumber,
} from "../../src/modules/vehicles/domain/inventory-age.ts";

const fixedNow = new Date("2026-10-29T12:00:00.000Z");

describe("inventory age", () => {
  test.each([
    ["2026-10-29", 0, false],
    ["2026-08-01", 89, false],
    ["2026-07-31", 90, false],
    ["2026-07-30", 91, true],
    ["2026-07-01", 120, true],
    ["2025-10-29", 365, true],
    ["2025-09-24", 400, true],
  ])("calculates %s as %i days and aging=%s", (inventoryDay, age, aging) => {
    expect(calculateAgeInDays(new Date(`${inventoryDay}T00:00:00.000Z`), fixedNow)).toBe(age);
    expect(isAgingStock(age)).toBe(aging);
  });

  test("clamps a future inventory date to age zero", () => {
    expect(calculateAgeInDays(new Date("2026-10-30T00:00:00.000Z"), fixedNow)).toBe(0);
  });

  test("treats 90 days as not aging and 91 days as aging", () => {
    expect(AGING_THRESHOLD_DAYS).toBe(90);
    expect(isAgingStock(90)).toBe(false);
    expect(isAgingStock(91)).toBe(true);
  });

  test.each([
    ["2026-10-29T23:59:59.999Z", 90],
    ["2026-10-30T00:00:00.000Z", 91],
  ])("uses the UTC date at rollover %s", (now, expectedAge) => {
    expect(calculateAgeInDays(new Date("2026-07-31T00:00:00.000Z"), new Date(now))).toBe(
      expectedAge,
    );
  });

  test.each([
    ["month end", "2026-01-31", "2026-02-01", 1],
    ["year end", "2025-12-31", "2026-01-01", 1],
    ["leap day", "2028-02-29", "2028-03-01", 1],
  ])("calculates calendar days across %s", (_edge, inventoryDay, nowDay, expectedAge) => {
    expect(
      calculateAgeInDays(
        new Date(`${inventoryDay}T00:00:00.000Z`),
        new Date(`${nowDay}T12:00:00.000Z`),
      ),
    ).toBe(expectedAge);
  });

  test("converts between dates and UTC day numbers", () => {
    const date = new Date("2026-10-29T23:59:59.999Z");
    expect(dateFromUtcDayNumber(toUtcDayNumber(date)).toISOString()).toBe(
      "2026-10-29T00:00:00.000Z",
    );
  });
});

describe("age filter ranges", () => {
  test.each([
    [{}, { min: 0, max: null }],
    [{ aging: true }, { min: 91, max: null }],
    [{ aging: false }, { min: 0, max: 90 }],
    [
      { aging: true, minAgeDays: 100 },
      { min: 100, max: null },
    ],
    [
      { aging: false, maxAgeDays: 40 },
      { min: 0, max: 40 },
    ],
    [{ aging: true, maxAgeDays: 50 }, null],
    [{ minAgeDays: 10, maxAgeDays: 5 }, null],
    [{ aging: false, minAgeDays: 91 }, null],
    [
      { minAgeDays: 10, maxAgeDays: 50 },
      { min: 10, max: 50 },
    ],
  ])("resolves %o", (filters, expected) => {
    expect(resolveAgeRange(filters)).toEqual(expected);
  });
});

describe("inventory date bounds", () => {
  test.each([
    [{ min: 0, max: null }, null, null],
    [{ min: 91, max: null }, "2026-07-30", null],
    [{ min: 0, max: 90 }, null, "2026-07-31"],
    [{ min: 91, max: 120 }, "2026-07-30", "2026-07-01"],
  ])("maps range %o to inclusive bounds", (range, onOrBefore, onOrAfter) => {
    const bounds = inventoryDateBounds(range, fixedNow);
    expect(bounds.onOrBefore?.toISOString().slice(0, 10) ?? null).toBe(onOrBefore);
    expect(bounds.onOrAfter?.toISOString().slice(0, 10) ?? null).toBe(onOrAfter);
  });
});
