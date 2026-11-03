import pino from "pino";

export function createLogger(level: string, nodeEnv: string): pino.Logger {
  return pino({
    level,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      censor: "[Redacted]",
    },
    ...(nodeEnv === "development"
      ? {
          transport: {
            target: "pino-pretty",
          },
        }
      : {}),
  });
}
