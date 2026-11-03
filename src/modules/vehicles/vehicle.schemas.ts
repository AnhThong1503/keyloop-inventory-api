import { z } from "zod";
import { ProposedAction } from "../../generated/prisma/enums.ts";

function wholeNumberQueryParam(minimum: number, maximum?: number) {
  const message =
    maximum === undefined
      ? `must be a whole number greater than or equal to ${minimum}`
      : `must be a whole number between ${minimum} and ${maximum}`;
  let numberSchema = z.number().int().min(minimum, { message });
  if (maximum !== undefined) {
    numberSchema = numberSchema.max(maximum, { message });
  }

  return z.string().regex(/^\d+$/, { message }).transform(Number).pipe(numberSchema);
}

export const listVehiclesQuerySchema = z
  .strictObject({
    make: z.string().trim().min(1).max(50).optional(),
    model: z.string().trim().min(1).max(50).optional(),
    dealershipId: z.uuid().optional(),
    aging: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    minAgeDays: wholeNumberQueryParam(0, 36500).optional(),
    maxAgeDays: wholeNumberQueryParam(0, 36500).optional(),
    page: wholeNumberQueryParam(1).default(1),
    pageSize: wholeNumberQueryParam(1, 100).default(20),
  })
  .refine(
    ({ minAgeDays, maxAgeDays }) =>
      minAgeDays === undefined || maxAgeDays === undefined || minAgeDays <= maxAgeDays,
    {
      message: "minAgeDays must be less than or equal to maxAgeDays",
      path: ["minAgeDays"],
    },
  );

export const vehicleIdParamSchema = z.strictObject({
  id: z.uuid(),
});

export const updateActionBodySchema = z.strictObject({
  action: z.enum(ProposedAction),
  note: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((note) => (note === "" ? null : note)),
});

export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
export type UpdateActionBody = z.infer<typeof updateActionBodySchema>;
