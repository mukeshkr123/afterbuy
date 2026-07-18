import { createRoute } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { z, type ZodError } from "zod";
import {
  apiErrorResponseSchema,
  createPurchaseRequestSchema,
  purchaseDetailResponseSchema,
  purchaseListQuerySchema,
  purchaseListResponseSchema,
  updatePurchaseRequestSchema,
  type CreatePurchaseRequest,
  type PurchaseListQuery,
  type UpdatePurchaseRequest,
} from "@acme/shared";
import {
  createDbClient,
  purchases,
  uuidv7,
  type DbClient,
  type PurchaseRow,
} from "@acme/db";
import type { Env } from "../env";
import type { AuthedContext } from "../auth";
import { apiError } from "../errors";
import { decodeCursor, encodeCursor, type Cursor } from "../keyset";

const TAG = "Purchases";

const idParamSchema = z.object({ id: z.string() });

// ---- Routes ---------------------------------------------------------------

export const purchasesListRoute = createRoute({
  method: "get",
  path: "/v1/purchases",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    query: purchaseListQuerySchema,
  },
  responses: {
    200: {
      description: "A page of purchases, newest first.",
      content: { "application/json": { schema: purchaseListResponseSchema } },
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

export const purchasesCreateRoute = createRoute({
  method: "post",
  path: "/v1/purchases",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: createPurchaseRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "The created purchase.",
      content: { "application/json": { schema: purchaseDetailResponseSchema } },
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

export const purchasesGetRoute = createRoute({
  method: "get",
  path: "/v1/purchases/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "The purchase detail.",
      content: { "application/json": { schema: purchaseDetailResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Purchase not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const purchasesPatchRoute = createRoute({
  method: "patch",
  path: "/v1/purchases/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: updatePurchaseRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "The updated purchase.",
      content: { "application/json": { schema: purchaseDetailResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Purchase not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    422: {
      description: "Validation failed.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const purchasesDeleteRoute = createRoute({
  method: "delete",
  path: "/v1/purchases/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    204: { description: "Purchase soft-deleted." },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Purchase not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const purchasesRestoreRoute = createRoute({
  method: "post",
  path: "/v1/purchases/{id}/restore",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "The restored purchase.",
      content: { "application/json": { schema: purchaseDetailResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Purchase not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

// ---- Handlers -------------------------------------------------------------

export async function handleListPurchases(ctx: AuthedContext) {
  const url = new URL(ctx.req.url);
  const raw = purchaseListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!raw.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid query parameters", {
      fields: zodFields(raw.error),
    });
  }
  const query: PurchaseListQuery = raw.data;
  const sort = query.sort ?? "createdAt";
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && cursor === null) {
    return apiError(ctx, 422, "validation_failed", "Invalid cursor");
  }
  if (cursor && cursor.kind !== cursorKindForSort(sort)) {
    return apiError(
      ctx,
      422,
      "validation_failed",
      "Cursor does not match the current sort key"
    );
  }

  const user = ctx.get("user");

  const { whereSql, whereArgs, orderSql } = buildPurchasePageWhere({
    userId: user.id,
    q: query.q,
    category: query.category,
    deliveryStatus: query.deliveryStatus,
    from: query.from,
    to: query.to,
    sort,
    cursor,
  });

  const limit = query.limit;
  const sql = `
    SELECT * FROM purchases
    WHERE ${whereSql}
    ${orderSql}
    LIMIT ?`;
  const result = await ctx.env.DB.prepare(sql)
    .bind(...whereArgs, limit + 1)
    .all<PurchaseRow>();

  const rows = (result.results ?? []) as PurchaseRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map(rowToPurchase);
  const lastRow = page[page.length - 1];
  const nextCursor =
    hasMore && lastRow ? encodeCursor(rowToCursor(lastRow, sort)) : null;

  const body = purchaseListResponseSchema.parse({ items, nextCursor });
  return ctx.json(body, 200);
}

export async function handleCreatePurchase(ctx: AuthedContext) {
  const parsed = createPurchaseRequestSchema.safeParse(await ctx.req.json());
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid purchase body", {
      fields: zodFields(parsed.error),
    });
  }
  const input: CreatePurchaseRequest = parsed.data;
  const user = ctx.get("user");
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const row: PurchaseRow = {
    id: uuidv7(),
    userId: user.id,
    title: input.title,
    merchant: input.merchant ?? null,
    category: input.category ?? "other",
    purchaseDate: input.purchaseDate ?? today,
    amountMinor: input.amountMinor ?? null,
    currency: input.currency ?? "USD",
    orderNumber: input.orderNumber ?? null,
    notes: input.notes ?? null,
    deliveryStatus: input.deliveryStatus ?? "ordered",
    trackingNumber: input.trackingNumber ?? null,
    carrier: input.carrier ?? null,
    warrantyExpiresAt: input.warrantyExpiresAt ?? null,
    returnDeadlineAt: input.returnDeadlineAt ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = createDbClient(ctx.env.DB);
  await db.insert(purchases).values(row);
  await onPurchaseMutated(ctx.env, db, row.id);
  const body = purchaseDetailResponseSchema.parse({
    ...rowToPurchase(row),
    receipts: [],
    claims: [],
    reminders: [],
  });
  return ctx.json(body, 201);
}

export async function handleGetPurchase(ctx: AuthedContext) {
  const user = ctx.get("user");
  const id = ctx.req.param("id");
  if (!id) return apiError(ctx, 404, "not_found", "Purchase not found");

  const db = createDbClient(ctx.env.DB);
  const row = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.id, id),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    )
    .get();
  if (!row) return apiError(ctx, 404, "not_found", "Purchase not found");

  const body = purchaseDetailResponseSchema.parse({
    ...rowToPurchase(row),
    receipts: [],
    claims: [],
    reminders: [],
  });
  return ctx.json(body, 200);
}

export async function handlePatchPurchase(ctx: AuthedContext) {
  const user = ctx.get("user");
  const id = ctx.req.param("id");
  if (!id) return apiError(ctx, 404, "not_found", "Purchase not found");

  const parsed = updatePurchaseRequestSchema.safeParse(await ctx.req.json());
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid purchase body", {
      fields: zodFields(parsed.error),
    });
  }
  const input: UpdatePurchaseRequest = parsed.data;
  if (Object.keys(input).length === 0) {
    return apiError(
      ctx,
      422,
      "validation_failed",
      "At least one field is required"
    );
  }

  const db = createDbClient(ctx.env.DB);
  const existing = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.id, id),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    )
    .get();
  if (!existing) return apiError(ctx, 404, "not_found", "Purchase not found");

  const updates: Partial<PurchaseRow> = { updatedAt: new Date().toISOString() };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    (updates as Record<string, unknown>)[key] = value;
  }

  await db
    .update(purchases)
    .set(updates)
    .where(
      and(
        eq(purchases.id, id),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    );

  const updated = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, id))
    .get();
  if (!updated) return apiError(ctx, 404, "not_found", "Purchase not found");

  await onPurchaseMutated(ctx.env, db, updated.id);

  const body = purchaseDetailResponseSchema.parse({
    ...rowToPurchase(updated),
    receipts: [],
    claims: [],
    reminders: [],
  });
  return ctx.json(body, 200);
}

export async function handleDeletePurchase(ctx: AuthedContext) {
  const user = ctx.get("user");
  const id = ctx.req.param("id");
  if (!id) return apiError(ctx, 404, "not_found", "Purchase not found");

  const db = createDbClient(ctx.env.DB);
  const now = new Date().toISOString();
  const result = await db
    .update(purchases)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(purchases.id, id),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    )
    .run();
  if (!result.success || result.meta.changes === 0) {
    return apiError(ctx, 404, "not_found", "Purchase not found");
  }
  return ctx.body(null, 204);
}

export async function handleRestorePurchase(ctx: AuthedContext) {
  const user = ctx.get("user");
  const id = ctx.req.param("id");
  if (!id) return apiError(ctx, 404, "not_found", "Purchase not found");

  const db = createDbClient(ctx.env.DB);
  const now = new Date().toISOString();
  const result = await db
    .update(purchases)
    .set({ deletedAt: null, updatedAt: now })
    .where(and(eq(purchases.id, id), eq(purchases.userId, user.id)))
    .run();
  if (!result.success || result.meta.changes === 0) {
    return apiError(ctx, 404, "not_found", "Purchase not found");
  }

  const restored = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.id, id), eq(purchases.userId, user.id)))
    .get();
  if (!restored) return apiError(ctx, 404, "not_found", "Purchase not found");

  await onPurchaseMutated(ctx.env, db, restored.id);

  const body = purchaseDetailResponseSchema.parse({
    ...rowToPurchase(restored),
    receipts: [],
    claims: [],
    reminders: [],
  });
  return ctx.json(body, 200);
}

// ---- Helpers --------------------------------------------------------------

function rowToPurchase(row: PurchaseRow) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    merchant: row.merchant,
    category: row.category,
    purchaseDate: row.purchaseDate,
    amountMinor: row.amountMinor,
    currency: row.currency,
    orderNumber: row.orderNumber,
    notes: row.notes,
    deliveryStatus: row.deliveryStatus,
    trackingNumber: row.trackingNumber,
    carrier: row.carrier,
    warrantyExpiresAt: row.warrantyExpiresAt,
    returnDeadlineAt: row.returnDeadlineAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function rowToCursor(
  row: PurchaseRow,
  sort: PurchaseListQuery["sort"]
): Cursor {
  const kind = cursorKindForSort(sort);
  if (kind === "created") return { kind, c: row.createdAt, i: row.id };
  if (kind === "date") return { kind, d: row.purchaseDate, i: row.id };
  return { kind: "amount", a: row.amountMinor ?? 0, i: row.id };
}

function cursorKindForSort(
  sort: PurchaseListQuery["sort"]
): "created" | "date" | "amount" {
  if (sort === "purchaseDate") return "date";
  if (sort === "amount") return "amount";
  return "created";
}

interface BuildArgs {
  userId: string;
  q?: string | undefined;
  category?: PurchaseListQuery["category"];
  deliveryStatus?: PurchaseListQuery["deliveryStatus"];
  from?: string | undefined;
  to?: string | undefined;
  sort: PurchaseListQuery["sort"];
  cursor: Cursor | null;
}

function buildPurchasePageWhere(args: BuildArgs): {
  whereSql: string;
  whereArgs: unknown[];
  orderSql: string;
} {
  const conditions: string[] = ["user_id = ?", "deleted_at IS NULL"];
  const bindArgs: unknown[] = [args.userId];

  if (args.q) {
    conditions.push("(title LIKE ? OR merchant LIKE ?)");
    bindArgs.push(`%${args.q}%`, `%${args.q}%`);
  }
  if (args.category) {
    conditions.push("category = ?");
    bindArgs.push(args.category);
  }
  if (args.deliveryStatus) {
    conditions.push("delivery_status = ?");
    bindArgs.push(args.deliveryStatus);
  }
  if (args.from) {
    conditions.push("purchase_date >= ?");
    bindArgs.push(args.from);
  }
  if (args.to) {
    conditions.push("purchase_date <= ?");
    bindArgs.push(args.to);
  }

  const sort = args.sort ?? "createdAt";
  const cursor = args.cursor;

  let orderCol: string;
  if (sort === "purchaseDate") orderCol = "purchase_date";
  else if (sort === "amount") orderCol = "amount_minor";
  else orderCol = "created_at";

  if (cursor) {
    if (cursor.kind === "created") {
      conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
      bindArgs.push(cursor.c, cursor.c, cursor.i);
    } else if (cursor.kind === "date") {
      conditions.push("(purchase_date < ? OR (purchase_date = ? AND id < ?))");
      bindArgs.push(cursor.d, cursor.d, cursor.i);
    } else {
      const amountKey = cursor.a ?? 0;
      conditions.push("(amount_minor < ? OR (amount_minor = ? AND id < ?))");
      bindArgs.push(amountKey, amountKey, cursor.i);
    }
  }

  const orderSql = `ORDER BY ${orderCol} DESC, id DESC`;
  return {
    whereSql: conditions.join(" AND "),
    whereArgs: bindArgs,
    orderSql,
  };
}

function zodFields(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] = issue.message;
  }
  return out;
}

// ---- Hook for Phase 4 -----------------------------------------------------

// Phase 4 replaces this body with the real reminder-derivation logic. The
// signature is fixed so Phase 4 is a drop-in.
export async function onPurchaseMutated(
  _env: Env,
  _db: DbClient,
  _purchaseId: string
): Promise<void> {
  // No-op until Phase 4 wires reminder regeneration.
}
