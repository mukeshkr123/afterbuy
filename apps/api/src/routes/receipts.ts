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
] as const;
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

  if (!isAllowedContentType(file.type)) {
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

  const detectedContentType = await detectImageContentType(file);
  if (!detectedContentType || detectedContentType !== file.type) {
    return apiError(
      ctx,
      422,
      "validation_failed",
      "File content does not match a supported receipt image type."
    );
  }

  const receiptId = uuidv7();
  const ext = extensionForContentType(detectedContentType);
  const r2Key = `receipts/${user.id}/${purchase.id}/${receiptId}.${ext}`;

  // Stream upload directly to R2
  try {
    await ctx.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: detectedContentType,
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
    contentType: detectedContentType,
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

  // Generate signed view URL
  const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const message = `${receipt.id}:${expires}`;
  const secret = getReceiptSigningSecret(ctx.env);
  if (!secret) {
    return apiError(
      ctx,
      503,
      "unavailable",
      "Receipt viewing is not configured"
    );
  }
  const token = await generateSignature(message, secret);

  const origin = new URL(ctx.req.url).origin;
  const viewUrl = `${origin}/v1/receipts/${receipt.id}/view?token=${token}&expires=${expires}`;

  return ctx.redirect(viewUrl, 302);
}

export async function handleViewReceipt(ctx: Context) {
  const id = ctx.req.param("id");
  const token = ctx.req.query("token");
  const expiresStr = ctx.req.query("expires");

  if (!id || !token || !expiresStr) {
    return apiError(ctx as any, 400, "validation_failed", "Missing parameters");
  }

  const expires = parseInt(expiresStr, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(expires) || now > expires) {
    return apiError(ctx as any, 410, "validation_failed", "URL has expired");
  }

  // Verify signature
  const env = ctx.env as Env;
  const secret = getReceiptSigningSecret(env);
  if (!secret) {
    return apiError(
      ctx as any,
      503,
      "unavailable",
      "Receipt viewing is not configured"
    );
  }
  const message = `${id}:${expires}`;
  const verified = await verifySignature(message, token, secret);
  if (!verified) {
    return apiError(ctx as any, 400, "validation_failed", "Invalid signature");
  }

  const db = createDbClient(env.DB);
  const receipt = await db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .get();

  if (!receipt) {
    return apiError(ctx as any, 404, "not_found", "Receipt not found");
  }

  // Fetch from R2
  const object = await env.STORAGE.get(receipt.r2Key);
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

async function detectImageContentType(
  file: File
): Promise<(typeof ALLOWED_CONTENT_TYPES)[number] | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    header.length >= 6 &&
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38 &&
    (header[4] === 0x37 || header[4] === 0x39) &&
    header[5] === 0x61
  ) {
    return "image/gif";
  }
  return null;
}

function extensionForContentType(
  contentType: (typeof ALLOWED_CONTENT_TYPES)[number]
): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
  }
}

function getReceiptSigningSecret(env: Env): string | null {
  if (env.RECEIPT_SIGNING_SECRET) return env.RECEIPT_SIGNING_SECRET;
  if (env.APP_STAGE !== "prod" && env.CLERK_WEBHOOK_SECRET) {
    return env.CLERK_WEBHOOK_SECRET;
  }
  return null;
}

function isAllowedContentType(
  contentType: string
): contentType is (typeof ALLOWED_CONTENT_TYPES)[number] {
  return ALLOWED_CONTENT_TYPES.some((allowed) => allowed === contentType);
}

async function verifySignature(
  message: string,
  token: string,
  secret: string
): Promise<boolean> {
  const calculated = await generateSignature(message, secret);
  return calculated === token;
}
