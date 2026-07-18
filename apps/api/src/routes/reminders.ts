import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, isNull, isNotNull, desc, asc } from "drizzle-orm";
import { apiErrorResponseSchema, reminderSchema } from "@acme/shared";
import { createDbClient, reminders, type ReminderRow } from "@acme/db";
import type { AuthedContext } from "../auth";
import { apiError } from "../errors";

const TAG = "Reminders";

const idParamSchema = z.object({ id: z.string() });

const remindersListResponseSchema = z.object({
  items: z.array(reminderSchema),
  nextCursor: z.string().nullable(),
});

// ---- Routes ---------------------------------------------------------------

export const remindersListRoute = createRoute({
  method: "get",
  path: "/v1/reminders",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      scope: z.enum(["upcoming", "history"]).default("upcoming"),
      cursor: z.string().optional(),
      limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 20)),
    }),
  },
  responses: {
    200: {
      description: "List of reminders.",
      content: { "application/json": { schema: remindersListResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const remindersDismissRoute = createRoute({
  method: "post",
  path: "/v1/reminders/{id}/dismiss",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "The dismissed reminder.",
      content: { "application/json": { schema: reminderSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Reminder not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

// ---- Handlers -------------------------------------------------------------

export async function handleListReminders(ctx: AuthedContext) {
  const user = ctx.get("user");
  const url = new URL(ctx.req.url);
  const querySchema = z.object({
    scope: z.enum(["upcoming", "history"]).default("upcoming"),
    cursor: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
  });

  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid query parameters");
  }

  const { scope, cursor, limit } = parsed.data;
  const db = createDbClient(ctx.env.DB);

  const pageSize = Math.min(limit, 50);

  const conditions = [eq(reminders.userId, user.id)];

  if (scope === "upcoming") {
    conditions.push(isNull(reminders.sentAt));
    conditions.push(isNull(reminders.dismissedAt));
  } else {
    conditions.push(isNotNull(reminders.sentAt));
  }

  // Basic keyset/cursor implementation
  if (cursor) {
    conditions.push(eq(reminders.id, cursor));
  }

  const orderBy =
    scope === "upcoming"
      ? [asc(reminders.fireOn), asc(reminders.id)]
      : [desc(reminders.sentAt), desc(reminders.id)];

  const rows = await db
    .select()
    .from(reminders)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize).map(rowToReminder);
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  return ctx.json({ items, nextCursor }, 200);
}

export async function handleDismissReminder(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Reminder not found");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  const existing = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
    .get();

  if (!existing) {
    return apiError(ctx, 404, "not_found", "Reminder not found");
  }

  const now = new Date().toISOString();
  await db
    .update(reminders)
    .set({ dismissedAt: now })
    .where(eq(reminders.id, id));

  const updated = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id))
    .get();

  if (!updated) {
    return apiError(ctx, 404, "not_found", "Reminder not found");
  }

  return ctx.json(rowToReminder(updated), 200);
}

// ---- Helpers --------------------------------------------------------------

export function rowToReminder(row: ReminderRow) {
  return {
    id: row.id,
    userId: row.userId,
    purchaseId: row.purchaseId,
    kind: row.kind as "warranty_expiry" | "return_deadline",
    fireOn: row.fireOn,
    sentAt: row.sentAt,
    dismissedAt: row.dismissedAt,
    createdAt: row.createdAt,
  };
}
