// All /v1 POST/PATCH/DELETE require an Idempotency-Key header. Replays
// return the cached response verbatim; reusing the same key with a
// different request body returns 409 conflict. The cache is per-user so
// two clients can't collide.
//
// This middleware must be registered AFTER `authMiddleware` on the /v1
// sub-app so that `c.get("user")` is populated.

import type { MiddlewareHandler } from "hono";
import { createDbClient, idempotencyKeys } from "@acme/db";
import { and, eq } from "drizzle-orm";
import type { AuthedEnv } from "./auth";
import { apiError } from "./errors";

const TTL_SECONDS = 60 * 60 * 24;

const UUIDISH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

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
    return apiError(c, 401, "unauthenticated", "Missing authenticated user");
  }

  const db = createDbClient(c.env.DB);
  const path = new URL(c.req.url).pathname;
  const requestHash = await sha256Hex(await c.req.raw.clone().arrayBuffer());

  // Check D1 for persisted idempotency key
  const existingRecord = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.userId, user.id))
    )
    .get();

  if (existingRecord) {
    if (
      existingRecord.path !== path ||
      existingRecord.requestHash !== requestHash
    ) {
      return apiError(
        c,
        409,
        "conflict",
        "Idempotency-Key reused with a different request"
      );
    }
    if (existingRecord.status === "completed" && existingRecord.responseCode) {
      return new Response(existingRecord.responseBody ?? "", {
        status: existingRecord.responseCode,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (existingRecord.status === "processing") {
      return apiError(
        c,
        409,
        "conflict",
        "A request with this Idempotency-Key is currently processing"
      );
    }
  }

  // Insert processing reservation into D1
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000).toISOString();

  try {
    await db.insert(idempotencyKeys).values({
      key,
      userId: user.id,
      path,
      requestHash,
      status: "processing",
      createdAt: now.toISOString(),
      expiresAt,
    });
  } catch {
    // If insertion failed, another concurrent request grabbed the key
    return apiError(
      c,
      409,
      "conflict",
      "Idempotency-Key reused with a different request"
    );
  }

  await next();

  try {
    const res = c.res as Response;
    const bodyText = await res.clone().text();
    await db
      .update(idempotencyKeys)
      .set({
        status: "completed",
        responseCode: res.status,
        responseBody: bodyText,
      })
      .where(eq(idempotencyKeys.key, key));
  } catch {
    // Ignore updates failure
  }
};

async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
