import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";
import { getRequestId } from "./logging";

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export const rateLimitMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: { requestId: string };
}> = async (c, next) => {
  if (c.env.RATE_LIMIT_ENABLED === "false") {
    await next();
    return;
  }

  let decision: RateLimitDecision;
  try {
    decision = await checkRateLimit(c.env, clientKey(c.req.raw));
  } catch {
    return c.json(
      {
        error: "Rate limit storage is not configured",
        requestId: getRequestId(c),
      },
      503
    );
  }
  c.header("x-ratelimit-remaining", String(decision.remaining));
  c.header("x-ratelimit-reset", decision.resetAt);

  if (!decision.allowed) {
    return c.json(
      { error: "Too Many Requests", requestId: getRequestId(c) },
      429
    );
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

  const maxRequests = positiveInteger(env.RATE_LIMIT_MAX_REQUESTS, 60);
  const windowSeconds = positiveInteger(env.RATE_LIMIT_WINDOW_SECONDS, 60);
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

function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous"
  );
}
