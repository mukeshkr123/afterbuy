// All /v1 POST/PATCH/DELETE require an Idempotency-Key header. Replays
// return the cached response verbatim; reusing the same key with a
// different request body returns 409 conflict. The cache is per-user so
// two clients can't collide.
//
// This middleware must be registered AFTER `authMiddleware` on the /v1
// sub-app so that `c.get("user")` is populated.

import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";
import type { AuthedEnv } from "./auth";
import { apiError } from "./errors";

const TTL_SECONDS = 60 * 60 * 24;

const UUIDISH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

interface CachedEntry {
  hash: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

export const idempotencyMiddleware: MiddlewareHandler<AuthedEnv> = async (
  c,
  next
) => {
  if (!WRITE_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const key = c.req.header("idempotency-key");
  if (!key) {
    return apiError(
      c,
      400,
      "validation_failed",
      "Idempotency-Key header is required for writes"
    );
  }
  if (!UUIDISH.test(key)) {
    return apiError(
      c,
      422,
      "validation_failed",
      "Idempotency-Key must be a UUID"
    );
  }

  const user = c.get("user");
  if (!user) {
    // Should not happen — authMiddleware runs first and rejects
    // unauthenticated requests with 401.
    return apiError(c, 401, "unauthenticated", "Missing authenticated user");
  }

  const body = await c.req.raw.clone().text();
  const hash = await sha256Hex(
    `${c.req.method}\n${new URL(c.req.url).pathname}\n${body}`
  );
  const cacheKey = `idem:${user.id}:${key}`;

  const cached = await c.env.APP_KV?.get(cacheKey);
  if (cached) {
    try {
      const entry = JSON.parse(cached) as CachedEntry;
      if (entry.hash !== hash) {
        return apiError(
          c,
          409,
          "conflict",
          "Idempotency-Key reused with a different request"
        );
      }
      return new Response(entry.body, {
        status: entry.status,
        headers: entry.headers,
      });
    } catch {
      // Bad cache entry — treat as miss.
    }
  }

  await next();

  // After the handler runs, capture the response and persist it. Failures
  // here are logged but never fail the original response.
  try {
    const res = c.res as Response;
    const buf = await res.clone().text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      headers[name] = value;
    });
    await c.env.APP_KV?.put(
      cacheKey,
      JSON.stringify({
        hash,
        status: res.status,
        headers,
        body: buf,
      } satisfies CachedEntry),
      { expirationTtl: TTL_SECONDS }
    );
  } catch {
    // Ignore cache write failures.
  }
};

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Avoid an unused-env warning when the type-checker can't see KV through
// the authed-env intersection.
export type IdempotencyEnv = Env;
