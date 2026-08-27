import { createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import {
  apiErrorResponseSchema,
  claimSchema,
  createClaimRequestSchema,
  updateClaimRequestSchema,
  claimTypeSchema,
  claimStatusSchema,
} from "@acme/shared";
import {
  createDbClient,
  claims,
  purchases,
  uuidv7,
  type DbClient,
  type ClaimRow,
} from "@acme/db";
import type { AuthedContext } from "../auth";
import { apiError } from "../errors";

const TAG = "Claims";

const idParamSchema = z.object({ id: z.string() });

const claimsListResponseSchema = z.object({
  items: z.array(claimSchema),
  nextCursor: z.string().nullable(),
});

// ---- Routes ---------------------------------------------------------------

export const claimsGetRoute = createRoute({
  method: "get",
  path: "/v1/claims/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "The claim detail.",
      content: { "application/json": { schema: claimSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Claim not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const claimsListRoute = createRoute({
  method: "get",
  path: "/v1/claims",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      purchaseId: z.string().optional(),
      type: claimTypeSchema.optional(),
      status: claimStatusSchema.optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of claims.",
      content: { "application/json": { schema: claimsListResponseSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const claimsCreateRoute = createRoute({
  method: "post",
  path: "/v1/claims",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: createClaimRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "The created claim.",
      content: { "application/json": { schema: claimSchema } },
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

export const claimsPatchRoute = createRoute({
  method: "patch",
  path: "/v1/claims/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": { schema: updateClaimRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "The updated claim.",
      content: { "application/json": { schema: claimSchema } },
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Claim not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    422: {
      description: "Validation failed.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

// ---- Handlers -------------------------------------------------------------

export async function handleGetClaim(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Claim not found");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  const row = await db
    .select()
    .from(claims)
    .where(and(eq(claims.id, id), eq(claims.userId, user.id)))
    .get();

  if (!row) {
    return apiError(ctx, 404, "not_found", "Claim not found");
  }

  return ctx.json(rowToClaim(row), 200);
}

export async function handleListClaims(ctx: AuthedContext) {
  const user = ctx.get("user");
  const url = new URL(ctx.req.url);
  const querySchema = z.object({
    purchaseId: z.string().optional(),
    type: claimTypeSchema.optional(),
    status: claimStatusSchema.optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  });

  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid query parameters");
  }

  const { purchaseId, type, status, cursor, limit } = parsed.data;
  const db = createDbClient(ctx.env.DB);

  const pageSize = limit;

  const conditions = [eq(claims.userId, user.id)];
  if (purchaseId) conditions.push(eq(claims.purchaseId, purchaseId));
  if (type) conditions.push(eq(claims.type, type));
  if (status) conditions.push(eq(claims.status, status));
  if (cursor) conditions.push(lt(claims.id, cursor));

  const rows = await db
    .select()
    .from(claims)
    .where(and(...conditions))
    .orderBy(desc(claims.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize).map(rowToClaim);
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  return ctx.json({ items, nextCursor }, 200);
}

export async function handleCreateClaim(ctx: AuthedContext) {
  const user = ctx.get("user");
  const parsed = createClaimRequestSchema.safeParse(await ctx.req.json());
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid request body");
  }
  const input = parsed.data;
  const db = createDbClient(ctx.env.DB);

  // Verify purchase exists, belongs to user, and is not deleted
  const purchase = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.id, input.purchaseId),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    )
    .get();

  if (!purchase) {
    return apiError(ctx, 404, "not_found", "Purchase not found");
  }

  const now = new Date().toISOString();
  const row: ClaimRow = {
    id: uuidv7(),
    userId: user.id,
    purchaseId: purchase.id,
    type: input.type,
    status: input.status,
    openedAt: input.openedAt || now,
    resolvedAt: null,
    refundAmountMinor: input.refundAmountMinor ?? null,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(claims).values(row);

  return ctx.json(rowToClaim(row), 201);
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["in_progress", "cancelled"],
  in_progress: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function handlePatchClaim(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Claim not found");
  }
  const user = ctx.get("user");
  const parsed = updateClaimRequestSchema.safeParse(await ctx.req.json());
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid request body");
  }
  const input = parsed.data;
  const db = createDbClient(ctx.env.DB);

  const existing = await db
    .select()
    .from(claims)
    .where(and(eq(claims.id, id), eq(claims.userId, user.id)))
    .get();

  if (!existing) {
    return apiError(ctx, 404, "not_found", "Claim not found");
  }

  // Validate status transition
  if (input.status && input.status !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(input.status)) {
      return apiError(
        ctx,
        422,
        "validation_failed",
        `Invalid status transition from ${existing.status} to ${input.status}`
      );
    }
  }

  const updates: Partial<ClaimRow> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.openedAt !== undefined) updates.openedAt = input.openedAt;
  if (input.resolvedAt !== undefined) updates.resolvedAt = input.resolvedAt;
  if (input.refundAmountMinor !== undefined)
    updates.refundAmountMinor = input.refundAmountMinor;
  if (input.reference !== undefined) updates.reference = input.reference;
  if (input.notes !== undefined) updates.notes = input.notes;

  await db.update(claims).set(updates).where(eq(claims.id, id));

  const updated = await db.select().from(claims).where(eq(claims.id, id)).get();

  if (!updated) {
    return apiError(ctx, 404, "not_found", "Claim not found");
  }

  return ctx.json(rowToClaim(updated), 200);
}

// ---- Helpers --------------------------------------------------------------

export function rowToClaim(row: ClaimRow) {
  return {
    id: row.id,
    userId: row.userId,
    purchaseId: row.purchaseId,
    type: row.type as "return" | "refund" | "warranty",
    status: row.status as
      | "draft"
      | "submitted"
      | "in_progress"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled",
    openedAt: row.openedAt,
    resolvedAt: row.resolvedAt,
    refundAmountMinor: row.refundAmountMinor,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
