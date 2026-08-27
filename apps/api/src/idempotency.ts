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

  let requestHash = "";
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const contentLength = c.req.header("content-length") ?? "0";
    requestHash = await sha256Hex(
      new TextEncoder().encode(`${path}:${contentLength}`)
    );
  } else {
    requestHash = await sha256Hex(await c.req.raw.clone().arrayBuffer());
  }

  const dbKey = `${user.id}:${key}`;

  // Check D1 for persisted idempotency key
  const existingRecord = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(eq(idempotencyKeys.key, dbKey), eq(idempotencyKeys.userId, user.id))
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
      if (existingRecord.responseCode === 204) {
        return new Response(null, {
          status: 204,
          headers: { "idempotency-replay": "true" },
        });
      }
      return new Response(existingRecord.responseBody ?? "", {
        status: existingRecord.responseCode,
        headers: {
          "Content-Type": "application/json",
          "idempotency-replay": "true",
        },
      });
    }
    if (existingRecord.status === "processing") {
      const isStale =
        Date.now() - new Date(existingRecord.createdAt).getTime() > 60_000;
      if (!isStale) {
        return apiError(
          c,
          409,
          "conflict",
          "A request with this Idempotency-Key is currently processing"
        );
      }
      await db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, dbKey),
            eq(idempotencyKeys.userId, user.id),
            eq(idempotencyKeys.createdAt, existingRecord.createdAt)
          )
        );
    }
  }

  // Insert processing reservation into D1
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000).toISOString();

  try {
    await db.insert(idempotencyKeys).values({
      key: dbKey,
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

  try {
    await next();
  } catch (err) {
    try {
      await db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, dbKey),
            eq(idempotencyKeys.userId, user.id)
          )
        );
    } catch {
      // Ignore deletion failure
    }
    throw err;
  }

  try {
    const res = c.res as Response;
    if (res.status < 500) {
      const bodyText = res.status === 204 ? "" : await res.clone().text();
      await db
        .update(idempotencyKeys)
        .set({
          status: "completed",
          responseCode: res.status,
          responseBody: bodyText,
        })
        .where(
          and(
            eq(idempotencyKeys.key, dbKey),
            eq(idempotencyKeys.userId, user.id)
          )
        );
    } else {
      await db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, dbKey),
            eq(idempotencyKeys.userId, user.id)
          )
        );
    }
  } catch {
    // Ignore updates failure
  }
};

async function sha256Hex(
  input: ArrayBufferView | ArrayBuffer
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
