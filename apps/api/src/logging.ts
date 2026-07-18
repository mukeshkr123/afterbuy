import type { Context, MiddlewareHandler } from "hono";

export function getRequestId(c: Context): string {
  return c.get("requestId") as string;
}

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("cf-ray") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  await next();
  c.header("x-request-id", requestId);
};

export const structuredLogger: MiddlewareHandler = async (c, next) => {
  const startedAt = Date.now();
  await next();
  console.log(
    JSON.stringify({
      level: "info",
      requestId: getRequestId(c),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    })
  );
};

export function logError(error: unknown, requestId: string): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(JSON.stringify({ level: "error", requestId, message }));
}
