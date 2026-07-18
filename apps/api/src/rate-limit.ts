import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";
import type { AuthedEnv } from "./auth";
import { apiError } from "./errors";

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

// 120 req/min keyed on user id (when available), falling back to IP. Phase 2
// requirement: per-user keying prevents NAT'd IPs from blocking each other.
const DEFAULT_MAX_REQUESTS = 120;
const DEFAULT_WINDOW_SECONDS = 60;

export const rateLimitMiddleware: MiddlewareHandler<AuthedEnv> = async (
  c,
  next
) => {
  if (c.env.RATE_LIMIT_ENABLED === "false") {
    await next();
    return;
  }

  let decision: RateLimitDecision;
  try {
    decision = await checkRateLimit(c.env, clientKey(c));
  } catch {
    return apiError(
      c,
      503,
      "unavailable",
      "Rate limit storage is not configured"
    );
  }
  c.header("x-ratelimit-remaining", String(decision.remaining));
  c.header("x-ratelimit-reset", decision.resetAt);

  if (!decision.allowed) {
    return apiError(c, 429, "rate_limited", "Too Many Requests");
  }

  await next();
};

export async function checkRateLimit(
  env: Pick<
    Env,
    "APP_KV" | "RATE_LIMIT_MAX_REQUESTS" | "RATE_LIMIT_WINDOW_SECONDS"
  >,
  key: string,
  now = new Date()
): Promise<RateLimitDecision> {
  if (!env.APP_KV) {
    throw new Error("Rate limit storage is not configured");
  }

  const maxRequests = positiveInteger(
    env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_MAX_REQUESTS
  );
  const windowSeconds = positiveInteger(
    env.RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS
  );
  const bucket = Math.floor(now.getTime() / (windowSeconds * 1000));
  const storageKey = `rate-limit:${key}:${bucket}`;
  const current = Number((await env.APP_KV.get(storageKey)) ?? "0");
  const next = current + 1;

  if (next > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: resetAt(now, windowSeconds).toISOString(),
    };
  }

  await env.APP_KV.put(storageKey, String(next), {
    expirationTtl: windowSeconds * 2,
  });

  return {
    allowed: true,
    remaining: maxRequests - next,
    resetAt: resetAt(now, windowSeconds).toISOString(),
  };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resetAt(now: Date, windowSeconds: number): Date {
  const resetMs =
    (Math.floor(now.getTime() / (windowSeconds * 1000)) + 1) *
    windowSeconds *
    1000;
  return new Date(resetMs);
}

function clientKey(c: {
  get: (key: "user") => { id: string } | undefined;
  req: { raw: Request };
}): string {
  const user = c.get("user");
  if (user) return `user:${user.id}`;
  const req = c.req.raw;
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for") ??
    "anonymous"
  );
}
