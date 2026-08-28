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
import { apiError, ApiError } from "./errors";
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
import { registerDevRoutes } from "./routes/dev";

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
    if (error instanceof ApiError) {
      return error.toResponse(c);
    }
    return apiError(c, 500, "internal", "Internal Server Error");
  });

  app.notFound((c) => apiError(c, 404, "not_found", "Route not found"));

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/openapi.json", openApiDocumentConfig());
  registerDevRoutes(app);

  app.openapi(healthRoute, (c) => {
    const body = healthCheckResponseSchema.parse(
      getHealth(c.env, getRequestId(c))
    );
    return c.json(body, body.status === "ok" ? 200 : 503);
  });

  // /v1/webhooks/clerk is unauthenticated (Svix-signed).
  app.openapi(clerkWebhookRoute, handleClerkWebhook);

  // Receipts view is unauthenticated
  app.openapi(receiptsViewRoute, handleViewReceipt);

  // All /v1 routes require Clerk auth. Middleware order matters:
  //   auth       — populates `user` on context
  //   idempotency — keyed on user.id; runs after auth so user is present
  //   rate-limit — keyed on user.id; runs last so missing user is impossible
  const v1 = new OpenAPIHono<AuthedEnv>();
  v1.use("*", authMiddleware);
  v1.use("*", idempotencyMiddleware);
  v1.use("*", rateLimitMiddleware);

  v1.openapi(meGetRoute, handleGetMe);
  v1.openapi(mePatchRoute, handlePatchMe);
  v1.openapi(meDeleteRoute, handleDeleteMe);

  // Purchases
  v1.openapi(purchasesListRoute, handleListPurchases);
  v1.openapi(purchasesCreateRoute, handleCreatePurchase);
  v1.openapi(purchasesGetRoute, handleGetPurchase);
  v1.openapi(purchasesPatchRoute, handlePatchPurchase);
  v1.openapi(purchasesDeleteRoute, handleDeletePurchase);
  v1.openapi(purchasesRestoreRoute, handleRestorePurchase);

  // Receipts
  v1.openapi(receiptsUploadRoute, handleUploadReceipt);
  v1.openapi(receiptsGetRoute, handleGetReceipt);
  v1.openapi(receiptsDeleteRoute, handleDeleteReceipt);

  // Claims
  v1.openapi(claimsListRoute, handleListClaims);
  v1.openapi(claimsGetRoute, handleGetClaim);
  v1.openapi(claimsCreateRoute, handleCreateClaim);
  v1.openapi(claimsPatchRoute, handlePatchClaim);

  // Reminders
  v1.openapi(remindersListRoute, handleListReminders);
  v1.openapi(remindersDismissRoute, handleDismissReminder);

  // Devices
  v1.openapi(devicesRegisterRoute, handleRegisterDevice);
  v1.openapi(devicesDeleteRoute, handleDeleteDevice);

  // Meta
  v1.openapi(metaCategoriesRoute, handleCategories);

  app.route("/", v1);

  return app;
}
