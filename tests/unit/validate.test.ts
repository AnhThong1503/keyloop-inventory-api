import type { Request } from "express";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ValidationError } from "../../src/shared/errors.ts";
import { validate } from "../../src/shared/validate.ts";

function fakeRequest(input: { params?: unknown; query?: unknown; body?: unknown }): Request {
  return {
    params: input.params ?? {},
    query: input.query ?? {},
    body: input.body,
  } as Request;
}

describe("validate", () => {
  test("returns parsed values without mutating request query", () => {
    const query = { count: "2" };
    const result = validate(fakeRequest({ params: { id: "ok" }, query }), {
      params: z.strictObject({ id: z.string() }),
      query: z.strictObject({ count: z.string().transform(Number) }),
    });

    expect(result.params).toEqual({ id: "ok" });
    expect(result.query).toEqual({ count: 2 });
    expect(result.body).toBeUndefined();
    expect(query).toEqual({ count: "2" });
  });

  test("collects every issue with its request location", () => {
    try {
      validate(
        fakeRequest({
          params: { id: "invalid" },
          query: { extra: "unexpected" },
          body: undefined,
        }),
        {
          params: z.strictObject({ id: z.uuid() }),
          query: z.strictObject({ page: z.string() }),
          body: z.strictObject({ action: z.string() }),
        },
      );
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ location: "params", path: "id" }),
          expect.objectContaining({ location: "query" }),
          expect.objectContaining({ location: "body" }),
        ]),
      );
      expect((error as ValidationError).details).toHaveLength(4);
    }
  });

  test("safely parses an undefined optional body", () => {
    const result = validate(fakeRequest({ body: undefined }), { body: z.undefined() });
    expect(result.body).toBeUndefined();
  });

  test("reports an undefined required body as a body validation issue", () => {
    try {
      validate(fakeRequest({ body: undefined }), {
        body: z.strictObject({ action: z.string() }),
      });
      throw new Error("Expected undefined body to fail validation");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual([
        expect.objectContaining({ location: "body" }),
      ]);
    }
  });
});
