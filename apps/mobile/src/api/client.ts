import type { z } from "zod";
import { apiErrorResponseSchema, type ApiErrorCode } from "@acme/shared";
import { uuidv4 } from "../lib/uuid";

export interface ApiOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export interface ApiRequestOptions<TBody> {
  method: HttpMethod;
  path: string;
  body?: TBody;
  query?: Record<string, string | number | undefined>;
  schema: z.ZodTypeAny;
  idempotencyKey?: string;
}

export type ApiRequest = <T>(req: ApiRequestOptions<unknown>) => Promise<T>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly fields: Record<string, string> | undefined;
  public readonly requestId: string | undefined;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
    requestId?: string
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
  }
}

export function createApi(opts: ApiOptions): ApiRequest {
  return async function request<T>(
    req: ApiRequestOptions<unknown>
  ): Promise<T> {
    const url = new URL(opts.baseUrl + req.path);
    if (req.query) {
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const token = await opts.getToken();
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (req.body !== undefined) headers["content-type"] = "application/json";
    if (token) headers.authorization = `Bearer ${token}`;
    if (req.method !== "GET") {
      headers["idempotency-key"] = req.idempotencyKey ?? uuidv4();
    }

    const init: RequestInit = { method: req.method, headers };
    if (req.body !== undefined) init.body = JSON.stringify(req.body);

    const res = await fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const json = safeJson(text);
      const parsed = apiErrorResponseSchema.safeParse(json);
      if (parsed.success) {
        throw new ApiError(
          res.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.fields,
          parsed.data.requestId
        );
      }
      throw new ApiError(
        res.status,
        res.status === 401
          ? "unauthenticated"
          : res.status === 403
            ? "forbidden"
            : res.status === 404
              ? "not_found"
              : res.status === 409
                ? "conflict"
                : res.status === 422
                  ? "validation_failed"
                  : res.status === 429
                    ? "rate_limited"
                    : res.status === 503
                      ? "unavailable"
                      : "internal",
        text.slice(0, 200)
      );
    }
    return req.schema.parse(safeJson(text)) as T;
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
