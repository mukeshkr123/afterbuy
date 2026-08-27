import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { and, eq, isNull, isNotNull, desc, asc, sql } from "drizzle-orm";
import {
  apiErrorResponseSchema,
  reminderSchema,
  type Reminder,
} from "@acme/shared";
import { createDbClient, reminders, type ReminderRow } from "@acme/db";
import type { AuthedContext, AuthedEnv } from "../auth";
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
      limit: z.coerce.number().int().min(1).max(50).default(20),
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

export const handleListReminders: RouteHandler<
  typeof remindersListRoute,
  AuthedEnv
> = async (ctx) => {
  const user = ctx.get("user");
  const { scope, cursor, limit } = ctx.req.valid("query");
  const db = createDbClient(ctx.env.DB);

  const pageSize = limit;

  const conditions = [eq(reminders.userId, user.id)];

  if (scope === "upcoming") {
    conditions.push(isNull(reminders.sentAt));
    conditions.push(isNull(reminders.dismissedAt));
  } else {
    conditions.push(isNotNull(reminders.sentAt));
  }

  if (cursor) {
    const cursorRow = await db
      .select({
        fireOn: reminders.fireOn,
        sentAt: reminders.sentAt,
        id: reminders.id,
      })
      .from(reminders)
      .where(and(eq(reminders.id, cursor), eq(reminders.userId, user.id)))
      .get();

    if (cursorRow) {
      if (scope === "upcoming") {
        conditions.push(
          sql`(${reminders.fireOn} > ${cursorRow.fireOn} OR (${reminders.fireOn} = ${cursorRow.fireOn} AND ${reminders.id} > ${cursorRow.id}))`
        );
      } else {
        const sentAt = cursorRow.sentAt ?? "";
        conditions.push(
          sql`(${reminders.sentAt} < ${sentAt} OR (${reminders.sentAt} = ${sentAt} AND ${reminders.id} < ${cursorRow.id}))`
        );
      }
    }
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
};

export const handleDismissReminder: RouteHandler<
  typeof remindersDismissRoute,
  AuthedEnv
> = async (ctx) => {
  const { id } = ctx.req.valid("param");
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
};

// ---- Helpers --------------------------------------------------------------

export function rowToReminder(row: ReminderRow): Reminder {
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
