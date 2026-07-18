import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { Webhook } from "svix";
import { z } from "zod";
import { users } from "@acme/db";
import { createDbClient } from "@acme/db";
import { apiErrorResponseSchema } from "@acme/shared";
import type { Context } from "hono";
import { apiError } from "../errors";

export const clerkWebhookRoute = createRoute({
  method: "post",
  path: "/v1/webhooks/clerk",
  tags: ["Identity"],
  security: [],
  responses: {
    200: { description: "Event accepted." },
    401: {
      description: "Invalid signature or missing Svix headers.",
      content: { "application/json": { schema: apiErrorResponseSchema } },
    },
  },
});

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmailAddress[] | undefined;
  primary_email_address_id?: string | null | undefined;
  deleted?: boolean | undefined;
}

interface ClerkEvent {
  type: string;
  data: ClerkUserData;
}

function extractPrimaryEmail(data: ClerkUserData): string | null {
  if (!data.email_addresses || data.email_addresses.length === 0) return null;
  const primaryId = data.primary_email_address_id;
  if (primaryId) {
    const primary = data.email_addresses.find((e) => e.id === primaryId);
    if (primary) return primary.email_address;
  }
  return data.email_addresses[0]?.email_address ?? null;
}

export async function handleClerkWebhook(c: Context) {
  if (!c.env.CLERK_WEBHOOK_SECRET) {
    return apiError(c, 503, "unavailable", "Webhook is not configured");
  }

  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return apiError(c, 401, "unauthenticated", "Missing Svix headers");
  }

  const rawBody = await c.req.text();
  const wh = new Webhook(c.env.CLERK_WEBHOOK_SECRET);
  let event: ClerkEvent;
  try {
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return apiError(c, 401, "unauthenticated", "Invalid signature");
  }

  const parsed = z
    .object({
      type: z.string(),
      data: z.object({
        id: z.string(),
        email_addresses: z
          .array(z.object({ id: z.string(), email_address: z.string() }))
          .optional(),
        primary_email_address_id: z.string().nullable().optional(),
        deleted: z.boolean().optional(),
      }),
    })
    .safeParse(event);
  if (!parsed.success) {
    return apiError(c, 401, "unauthenticated", "Malformed event");
  }

  const db = createDbClient(c.env.DB);

  switch (parsed.data.type) {
    case "user.deleted": {
      const now = new Date().toISOString();
      await db
        .update(users)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(users.clerkUserId, parsed.data.data.id));
      await c.env.REMINDER_QUEUE.send({
        type: "receipts.purge",
        userId: parsed.data.data.id,
      });
      break;
    }
    case "user.updated": {
      const email = extractPrimaryEmail(parsed.data.data);
      if (email !== null) {
        await db
          .update(users)
          .set({ email, updatedAt: new Date().toISOString() })
          .where(eq(users.clerkUserId, parsed.data.data.id));
      }
      break;
    }
    default:
      // Acknowledge unknown events with 200 to prevent Clerk retry storms.
      break;
  }

  return c.body(null, 200);
}
