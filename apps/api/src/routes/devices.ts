import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
  apiErrorResponseSchema,
  deviceSchema,
  registerDeviceRequestSchema,
} from "@acme/shared";
import { createDbClient, devices, uuidv7, type DeviceRow } from "@acme/db";
import type { AuthedContext } from "../auth";
import { apiError } from "../errors";

const TAG = "Devices";

const idParamSchema = z.object({ id: z.string() });

// ---- Routes ---------------------------------------------------------------

export const devicesRegisterRoute = createRoute({
  method: "post",
  path: "/v1/devices",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: registerDeviceRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "The registered device.",
      content: { "application/json": { schema: deviceSchema } },
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

export const devicesDeleteRoute = createRoute({
  method: "delete",
  path: "/v1/devices/{id}",
  tags: [TAG],
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Device deleted successfully.",
    },
    401: {
      description: "Unauthenticated.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
    404: {
      description: "Device not found.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

// ---- Handlers -------------------------------------------------------------

export async function handleRegisterDevice(ctx: AuthedContext) {
  const user = ctx.get("user");
  const parsed = registerDeviceRequestSchema.safeParse(await ctx.req.json());
  if (!parsed.success) {
    return apiError(ctx, 422, "validation_failed", "Invalid request body");
  }
  const input = parsed.data;
  const db = createDbClient(ctx.env.DB);

  const now = new Date().toISOString();
  const deviceId = uuidv7();

  const row: DeviceRow = {
    id: deviceId,
    userId: user.id,
    expoPushToken: input.expoPushToken,
    platform: input.platform,
    lastSeenAt: now,
    createdAt: now,
  };

  await db
    .insert(devices)
    .values(row)
    .onConflictDoUpdate({
      target: devices.expoPushToken,
      set: {
        userId: user.id,
        platform: input.platform,
        lastSeenAt: now,
      },
    });

  // Fetch the actual record to return (since the id might be the old one on update conflict)
  const record = await db
    .select()
    .from(devices)
    .where(eq(devices.expoPushToken, input.expoPushToken))
    .get();

  if (!record) {
    return apiError(
      ctx,
      500,
      "internal",
      "Failed to retrieve registered device"
    );
  }

  return ctx.json(rowToDevice(record), 200);
}

export async function handleDeleteDevice(ctx: AuthedContext) {
  const id = ctx.req.param("id");
  if (!id) {
    return apiError(ctx, 404, "not_found", "Device not found");
  }
  const user = ctx.get("user");
  const db = createDbClient(ctx.env.DB);

  const existing = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, user.id)))
    .get();

  if (!existing) {
    return apiError(ctx, 404, "not_found", "Device not found");
  }

  await db.delete(devices).where(eq(devices.id, id));

  return ctx.body(null, 204);
}

// ---- Helpers --------------------------------------------------------------

export function rowToDevice(row: DeviceRow) {
  return {
    id: row.id,
    userId: row.userId,
    expoPushToken: row.expoPushToken,
    platform: row.platform as "ios" | "android",
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}
