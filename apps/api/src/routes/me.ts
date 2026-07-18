import { createRoute } from "@hono/zod-openapi";
import { eq, and, isNull } from "drizzle-orm";
import {
  apiErrorResponseSchema,
  meResponseSchema,
  patchMeRequestSchema,
  type MeResponse,
  type PatchMeRequest,
} from "@acme/shared";
import { users, purchases, type UserRow } from "@acme/db";
import { createDbClient } from "@acme/db";
import type { AuthedContext } from "../auth";
import { apiError } from "../errors";
import { onPurchaseMutated } from "./purchases";

export const meGetRoute = createRoute({
  method: "get",
  path: "/v1/me",
  tags: ["Identity"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "The authenticated user profile.",
      content: { "application/json": { schema: meResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "User not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    503: {
      description: "Authentication is not configured.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const mePatchRoute = createRoute({
  method: "patch",
  path: "/v1/me",
  tags: ["Identity"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: patchMeRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "The updated user profile.",
      content: { "application/json": { schema: meResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    422: {
      description: "Validation failed.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const meDeleteRoute = createRoute({
  method: "delete",
  path: "/v1/me",
  tags: ["Identity"],
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Account soft-deleted." },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export function rowToMe(row: UserRow): MeResponse {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
    reminderLeadDays: row.reminderLeadDays,
    pushEnabled: row.pushEnabled === 1,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function handleGetMe(ctx: AuthedContext) {
  const db = createDbClient(ctx.env.DB);
  const user = ctx.get("user");
  const row = await db.select().from(users).where(eq(users.id, user.id)).get();
  if (!row) {
    return apiError(ctx, 404, "not_found", "User not found");
  }
  const body = meResponseSchema.parse(rowToMe(row));
  return ctx.json(body, 200);
}

export async function handlePatchMe(ctx: AuthedContext, rawBody: unknown) {
  const body = patchMeRequestSchema.parse(rawBody) as PatchMeRequest;
  const db = createDbClient(ctx.env.DB);
  const user = ctx.get("user");
  const now = new Date().toISOString();
  const updates: Partial<UserRow> = { updatedAt: now };
  if (body.reminderLeadDays !== undefined)
    updates.reminderLeadDays = body.reminderLeadDays;
  if (body.pushEnabled !== undefined)
    updates.pushEnabled = body.pushEnabled ? 1 : 0;
  if (body.timezone !== undefined) updates.timezone = body.timezone;

  await db.update(users).set(updates).where(eq(users.id, user.id));

  if (body.reminderLeadDays !== undefined) {
    const userPurchases = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(and(eq(purchases.userId, user.id), isNull(purchases.deletedAt)));

    for (const p of userPurchases) {
      await onPurchaseMutated(ctx.env, db, p.id);
    }
  }

  const updated = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .get();
  if (!updated) {
    return apiError(ctx, 404, "not_found", "User not found");
  }
  return ctx.json(meResponseSchema.parse(rowToMe(updated)), 200);
}

export async function handleDeleteMe(ctx: AuthedContext) {
  const db = createDbClient(ctx.env.DB);
  const user = ctx.get("user");
  const now = new Date().toISOString();
  await db
    .update(users)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(users.id, user.id));

  // Phase 4 implements the receipts.purge R2 deletion; here we enqueue
  // a message that Phase 4's consumer will dispatch on.
  await ctx.env.REMINDER_QUEUE.send({
    type: "receipts.purge",
    userId: user.id,
  });

  return ctx.body(null, 204);
}
