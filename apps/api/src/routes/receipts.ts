import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { apiErrorResponseSchema, receiptSchema } from "@acme/shared";
import {
  createDbClient,
  purchases,
  receipts,
  uuidv7,
  type DbClient,
  type ReceiptRow,
} from "@acme/db";
import type { AuthedContext } from "../auth";
import type { Env } from "../env";
import { apiError } from "../errors";
import type { Context } from "hono";

const TAG = "Receipts";

const idParamSchema = z.object({ id: z.string() });
const purchaseIdParamSchema = z.object({ id: z.string() });

// ---- Routes ---------------------------------------------------------------

export const receiptsUploadRoute = createRoute({
  method: "post",
  path: "/v1/purchases/{id}/receipts",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: purchaseIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({
              type: "string",
              format: "binary",
              description: "Receipt image file",
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "The uploaded receipt.",
      content: { "application/json": { schema: receiptSchema } },
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
      description: "Validation failed (invalid file size or type).",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const receiptsGetRoute = createRoute({
  method: "get",
  path: "/v1/receipts/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    302: {
      description: "Redirect to signed view URL.",
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Receipt not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const receiptsViewRoute = createRoute({
  method: "get",
  path: "/v1/receipts/{id}/view",
  tags: [TAG],
  request: {
    params: idParamSchema,
    query: z.object({
      token: z.string(),
      expires: z.string(),
    }),
  },
  responses: {
    200: {
      description: "The raw receipt image.",
    },
    400: {
      description: "Invalid or expired token.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Receipt not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

export const receiptsDeleteRoute = createRoute({
  method: "delete",
  path: "/v1/receipts/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Receipt deleted.",
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Receipt not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

// ---- Handlers -------------------------------------------------------------

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function handleUploadReceipt(ctx: AuthedContext) {
  const purchaseId = ctx.req.param("id");
  if (!purchaseId) {
    return apiError(ctx, 400, "validation_failed", "Missing purchase ID");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  // Verify purchase exists, belongs to user, and is not deleted
  const purchase = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.id, purchaseId),
        eq(purchases.userId, user.id),
        isNull(purchases.deletedAt)
      )
    )
    .get();

  if (!purchase) {
    return apiError(ctx, 404, "not_found", "Purchase not found");
  }

  // Parse body
  let body: any;
  try {
    body = await ctx.req.parseBody();
  } catch (err) {
    return apiError(ctx, 422, "validation_failed", "Failed to parse form data");
  }

  const file = body.file;
  if (!(file instanceof File)) {
    return apiError(ctx, 422, "validation_failed", "Missing file field");
  }

  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return apiError(
      ctx,
      422,
      "validation_failed",
      "Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed."
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError(
      ctx,
      422,
      "validation_failed",
      "File size exceeds 5MB limit."
    );
  }

  const receiptId = uuidv7();
  const ext = file.name.split(".").pop() || "jpg";
  const r2Key = `receipts/${user.id}/${purchase.id}/${receiptId}.${ext}`;

  // Stream upload directly to R2
  try {
    await ctx.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId: user.id,
        purchaseId: purchase.id,
      },
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return apiError(ctx, 500, "internal", "Storage upload failed");
  }

  // Insert metadata in DB
  const now = new Date().toISOString();
  const row: ReceiptRow = {
    id: receiptId,
    purchaseId: purchase.id,
    userId: user.id,
    r2Key,
    contentType: file.type,
    sizeBytes: file.size,
    width: null,
    height: null,
    createdAt: now,
  };

  await db.insert(receipts).values(row);

  const response = receiptSchema.parse(row);
  return ctx.json(response, 201);
}

export async function handleGetReceipt(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Receipt not found");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  const receipt = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, user.id)))
    .get();

  if (!receipt) {
    return apiError(ctx, 404, "not_found", "Receipt not found");
  }

  // Generate HMAC signed URL with 5-minute TTL
  const ttlSeconds = 300;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const secret = ctx.env.CLERK_WEBHOOK_SECRET || "fallback-unsafe-secret";
  const message = `${id}:${expires}`;
  const token = await generateSignature(message, secret);

  const url = `${new URL(ctx.req.url).origin}/v1/receipts/${id}/view?token=${token}&expires=${expires}`;
  return ctx.redirect(url, 302);
}

export async function handleViewReceipt(ctx: Context) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx as any, 404, "not_found", "Receipt not found");
  }
  const { token, expires } = ctx.req.query();

  if (!token || !expires) {
    return apiError(
      ctx as any,
      400,
      "validation_failed",
      "Missing token or expires query parameter"
    );
  }

  // Verify expiration
  const expiresTimestamp = parseInt(expires, 10);
  if (
    isNaN(expiresTimestamp) ||
    expiresTimestamp < Math.floor(Date.now() / 1000)
  ) {
    return apiError(
      ctx as any,
      400,
      "validation_failed",
      "Token expired or invalid"
    );
  }

  // Verify signature
  const secret = ctx.env.CLERK_WEBHOOK_SECRET || "fallback-unsafe-secret";
  const message = `${id}:${expires}`;
  const verified = await verifySignature(message, token, secret);
  if (!verified) {
    return apiError(ctx as any, 400, "validation_failed", "Invalid signature");
  }

  const db = createDbClient(ctx.env.DB);
  const receipt = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .get();

  if (!receipt) {
    return apiError(ctx as any, 404, "not_found", "Receipt not found");
  }

  // Fetch from R2
  const object = await ctx.env.STORAGE.get(receipt.r2Key);
  if (!object) {
    return apiError(ctx as any, 404, "not_found", "File not found in storage");
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": receipt.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function handleDeleteReceipt(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Receipt not found");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  const receipt = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, user.id)))
    .get();

  if (!receipt) {
    return apiError(ctx, 404, "not_found", "Receipt not found");
  }

  // Delete from R2
  try {
    await ctx.env.STORAGE.delete(receipt.r2Key);
  } catch (err) {
    console.error("R2 deletion error:", err);
  }

  // Delete from DB
  await db.delete(receipts).where(eq(receipts.id, id));

  return ctx.body(null, 204);
}

// ---- Cryptographic Helpers ------------------------------------------------

async function generateSignature(
  message: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(
  message: string,
  token: string,
  secret: string
): Promise<boolean> {
  const calculated = await generateSignature(message, secret);
  return calculated === token;
}
