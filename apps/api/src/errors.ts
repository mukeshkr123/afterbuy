import type { Context, TypedResponse } from "hono";
import {
  apiErrorResponseSchema,
  type ApiErrorCode,
  type ApiErrorResponse,
} from "@acme/shared";
import { getRequestId } from "./logging";

export type ApiErrorStatus =
  400 | 401 | 403 | 404 | 409 | 410 | 422 | 429 | 500 | 503;

export interface ApiErrorOptions {
  fields?: Record<string, string>;
}

export function apiError(
  c: Context,
  status: ApiErrorStatus,
  code: ApiErrorCode,
  message: string,
  options: ApiErrorOptions = {}
): Response & TypedResponse<ApiErrorResponse, any, "json"> {
  const body = apiErrorResponseSchema.parse({
    error: {
      code,
      message,
      ...(options.fields ? { fields: options.fields } : {}),
    },
    requestId: getRequestId(c),
  });
  return c.json(
    body,
    status as 400 | 401 | 403 | 404 | 409 | 410 | 422 | 429 | 500 | 503
  ) as Response & TypedResponse<ApiErrorResponse, any, "json">;
}

export class ApiError extends Error {
  public override readonly name = "ApiError";
  constructor(
    public readonly status: ApiErrorStatus,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message);
  }

  toResponse(c: Context): Response {
    return apiError(c, this.status, this.code, this.message, {
      ...(this.fields ? { fields: this.fields } : {}),
    });
  }
}
