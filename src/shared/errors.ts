export interface ErrorDetail {
  location: "query" | "params" | "body";
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[]) {
    super(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message = "Resource not found") {
    super(404, code, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable") {
    super(503, "SERVICE_UNAVAILABLE", message);
  }
}
