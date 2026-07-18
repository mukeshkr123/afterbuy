import { cors } from "hono/cors";
import type { Env } from "./env";

export function corsMiddleware() {
  return cors({
    origin(origin, c) {
      const allowed = parseAllowedOrigins(c.env.ALLOWED_ORIGINS);
      if (!origin || !allowed.has(origin)) {
        return null;
      }
      return origin;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["content-type", "x-request-id", "idempotency-key"],
    exposeHeaders: [
      "x-request-id",
      "idempotency-key",
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
    ],
    maxAge: 600,
  });
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}
