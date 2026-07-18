import { OpenAPIHono } from "@hono/zod-openapi";
import {
  healthCheckResponseSchema,
  meResponseSchema,
  patchMeRequestSchema,
  type PatchMeRequest,
} from "@acme/shared";
import { users, type UserRow } from "@acme/db";
import { createDbClient } from "@acme/db";
import { authMiddleware, type AuthedEnv } from "./auth";
import { corsMiddleware } from "./cors";
import type { Env } from "./env";
import { apiError } from "./errors";
import { getHealth } from "./health";
import { idempotencyMiddleware } from "./idempotency";
import {
  getRequestId,
  logError,
  requestIdMiddleware,
  structuredLogger,
} from "./logging";
import { healthRoute, openApiDocumentConfig } from "./openapi";
import { rateLimitMiddleware } from "./rate-limit";
import { meGetRoute, mePatchRoute, meDeleteRoute, rowToMe } from "./routes/me";
import { handleCategories, metaCategoriesRoute } from "./routes/meta";
import {
  handleCreatePurchase,
  handleDeletePurchase,
  handleGetPurchase,
  handleListPurchases,
  handlePatchPurchase,
  handleRestorePurchase,
  purchasesCreateRoute,
  purchasesDeleteRoute,
  purchasesGetRoute,
  purchasesListRoute,
  purchasesPatchRoute,
  purchasesRestoreRoute,
} from "./routes/purchases";
import { handleClerkWebhook, clerkWebhookRoute } from "./routes/webhooks";

export function createApp() {
  const app = new OpenAPIHono<{
    Bindings: Env;
    Variables: { requestId: string };
  }>();

  app.use("*", requestIdMiddleware);
  app.use("*", structuredLogger);
  app.use("*", corsMiddleware());

  app.onError((error, c) => {
    const requestId = getRequestId(c);
    logError(error, requestId);
    return apiError(c, 500, "internal", "Internal Server Error");
  });

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/openapi.json", openApiDocumentConfig());

  app.openapi(healthRoute, (c) => {
    const body = healthCheckResponseSchema.parse(
      getHealth(c.env, getRequestId(c))
    );
    return c.json(body, body.status === "ok" ? 200 : 503);
  });

  // /v1/webhooks/clerk is unauthenticated (Svix-signed).
  app.openapi(clerkWebhookRoute, (c) => handleClerkWebhook(c));

  // All /v1 routes require Clerk auth. Middleware order matters:
  //   auth       — populates `user` on context
  //   idempotency — keyed on user.id; runs after auth so user is present
  //   rate-limit — keyed on user.id; runs last so missing user is impossible
  const v1 = new OpenAPIHono<AuthedEnv>();
  v1.use("*", authMiddleware);
  v1.use("*", idempotencyMiddleware);
  v1.use("*", rateLimitMiddleware);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(meGetRoute, (async (c: any) => {
    const db = createDbClient(c.env.DB);
    const user = c.get("user");
    const row = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .get();
    if (!row) return apiError(c, 404, "not_found", "User not found");
    return c.json(meResponseSchema.parse(rowToMe(row)), 200);
  }) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(mePatchRoute, (async (c: any) => {
    const body = patchMeRequestSchema.parse(
      await c.req.json()
    ) as PatchMeRequest;
    const db = createDbClient(c.env.DB);
    const user = c.get("user");
    const now = new Date().toISOString();
    const updates: Partial<UserRow> = { updatedAt: now };
    if (body.reminderLeadDays !== undefined)
      updates.reminderLeadDays = body.reminderLeadDays;
    if (body.pushEnabled !== undefined)
      updates.pushEnabled = body.pushEnabled ? 1 : 0;
    if (body.timezone !== undefined) updates.timezone = body.timezone;

    await db.update(users).set(updates).where(eq(users.id, user.id));
    const updated = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .get();
    if (!updated) return apiError(c, 404, "not_found", "User not found");
    return c.json(meResponseSchema.parse(rowToMe(updated)), 200);
  }) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(meDeleteRoute, (async (c: any) => {
    const db = createDbClient(c.env.DB);
    const user = c.get("user");
    const now = new Date().toISOString();
    await db
      .update(users)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
    await c.env.REMINDER_QUEUE.send({
      type: "receipts.purge",
      userId: user.id,
    });
    return c.body(null, 204);
  }) as any);

  // Purchases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesListRoute, ((c: any) => handleListPurchases(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesCreateRoute, ((c: any) =>
    handleCreatePurchase(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesGetRoute, ((c: any) => handleGetPurchase(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesPatchRoute, ((c: any) => handlePatchPurchase(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesDeleteRoute, ((c: any) =>
    handleDeletePurchase(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(purchasesRestoreRoute, ((c: any) =>
    handleRestorePurchase(c)) as any);

  // Meta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(metaCategoriesRoute, ((c: any) => handleCategories(c)) as any);

  app.route("/", v1);

  return app;
}

import { eq } from "drizzle-orm";
