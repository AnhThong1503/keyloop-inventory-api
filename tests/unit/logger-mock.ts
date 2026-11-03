import { vi } from "vitest";
import type pino from "pino";

export function createLoggerMock(): pino.Logger {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  } as unknown as pino.Logger;
}
