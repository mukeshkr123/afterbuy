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
import {
  meGetRoute,
  mePatchRoute,
  meDeleteRoute,
  rowToMe,
  handleGetMe,
  handlePatchMe,
  handleDeleteMe,
} from "./routes/me";
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
import {
  handleDeleteReceipt,
  handleGetReceipt,
  handleUploadReceipt,
  handleViewReceipt,
  receiptsDeleteRoute,
  receiptsGetRoute,
  receiptsUploadRoute,
  receiptsViewRoute,
} from "./routes/receipts";
import {
  handleListClaims,
  handleGetClaim,
  handleCreateClaim,
  handlePatchClaim,
  claimsListRoute,
  claimsGetRoute,
  claimsCreateRoute,
  claimsPatchRoute,
} from "./routes/claims";
import {
  handleListReminders,
  handleDismissReminder,
  remindersListRoute,
  remindersDismissRoute,
} from "./routes/reminders";
import {
  handleRegisterDevice,
  handleDeleteDevice,
  devicesRegisterRoute,
  devicesDeleteRoute,
} from "./routes/devices";

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

  // Receipts view is unauthenticated
  app.openapi(receiptsViewRoute, (c) => handleViewReceipt(c));

  // All /v1 routes require Clerk auth. Middleware order matters:
  //   auth       — populates `user` on context
  //   idempotency — keyed on user.id; runs after auth so user is present
  //   rate-limit — keyed on user.id; runs last so missing user is impossible
  const v1 = new OpenAPIHono<AuthedEnv>();
  v1.use("*", authMiddleware);
  v1.use("*", idempotencyMiddleware);
  v1.use("*", rateLimitMiddleware);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(meGetRoute, (async (c: any) => handleGetMe(c)) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(mePatchRoute, (async (c: any) =>
    handlePatchMe(c, await c.req.json())) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(meDeleteRoute, (async (c: any) => handleDeleteMe(c)) as any);

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

  // Receipts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(receiptsUploadRoute, ((c: any) => handleUploadReceipt(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(receiptsGetRoute, ((c: any) => handleGetReceipt(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(receiptsDeleteRoute, ((c: any) => handleDeleteReceipt(c)) as any);

  // Claims
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(claimsListRoute, ((c: any) => handleListClaims(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(claimsGetRoute, ((c: any) => handleGetClaim(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(claimsCreateRoute, ((c: any) => handleCreateClaim(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(claimsPatchRoute, ((c: any) => handlePatchClaim(c)) as any);

  // Reminders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(remindersListRoute, ((c: any) => handleListReminders(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(remindersDismissRoute, ((c: any) =>
    handleDismissReminder(c)) as any);

  // Devices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(devicesRegisterRoute, ((c: any) =>
    handleRegisterDevice(c)) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(devicesDeleteRoute, ((c: any) => handleDeleteDevice(c)) as any);

  // Meta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1.openapi(metaCategoriesRoute, ((c: any) => handleCategories(c)) as any);

  app.route("/", v1);

  return app;
}

import { eq } from "drizzle-orm";
