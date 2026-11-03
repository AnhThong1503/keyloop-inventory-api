import type { Request } from "express";
import { z } from "zod";
import { ValidationError, type ErrorDetail } from "./errors.ts";

type RequestSchema = z.ZodType;
type SchemaOutput<Schema extends RequestSchema | undefined> = Schema extends RequestSchema
  ? z.output<Schema>
  : undefined;

export function validate<
  Params extends RequestSchema | undefined = undefined,
  Query extends RequestSchema | undefined = undefined,
  Body extends RequestSchema | undefined = undefined,
>(
  request: Request,
  schemas: {
    params?: Params;
    query?: Query;
    body?: Body;
  },
): {
  params: SchemaOutput<Params>;
  query: SchemaOutput<Query>;
  body: SchemaOutput<Body>;
} {
  const details: ErrorDetail[] = [];

  function parse(
    schema: RequestSchema | undefined,
    value: unknown,
    location: ErrorDetail["location"],
  ): unknown {
    if (!schema) {
      return undefined;
    }

    const result = schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    for (const issue of result.error.issues) {
      const path = issue.path
        .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
        .join(".");
      details.push({ location, path, message: issue.message });
    }
    return undefined;
  }

  const params = parse(schemas.params, request.params, "params");
  const query = parse(schemas.query, request.query, "query");
  const body = parse(schemas.body, request.body, "body");

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  return { params, query, body } as {
    params: SchemaOutput<Params>;
    query: SchemaOutput<Query>;
    body: SchemaOutput<Body>;
  };
}
