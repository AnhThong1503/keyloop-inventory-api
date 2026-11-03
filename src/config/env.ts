import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(3000),
  DATABASE_URL: z
    .string()
    .refine((value) => /^postgres(?:ql)?:\/\//.test(value), {
      message: "must start with postgresql:// or postgres://",
    })
    .refine(
      (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: "must be a valid PostgreSQL URL" },
    ),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const invalidNames = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "environment"))),
    ];
    throw new Error(`Invalid environment configuration: ${invalidNames.join(", ")}`);
  }

  return parsed.data;
}
