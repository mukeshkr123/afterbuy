import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  cachedFindOrProvisionUser,
  type AuthedUser,
  type AuthedVariables,
} from "../auth";
import { apiError } from "../errors";
import type { Env } from "../env";
import {
  createDbClient,
  purchases,
  claims,
  receipts,
  reminders,
  uuidv7,
} from "@acme/db";
import { onPurchaseMutated } from "./purchases";
import type { OpenAPIHono } from "@hono/zod-openapi";

const seedRequestSchema = z
  .object({
    email: z.string().email(),
    includeReceipts: z.boolean().optional().default(true),
    mode: z.literal("append").optional().default("append"),
  })
  .strict();

const CLERK_USER_LIST_SCHEMA = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        primary_email_address_id: z.string().nullable().optional(),
        email_addresses: z
          .array(
            z.object({
              id: z.string(),
              email_address: z.string().email(),
            })
          )
          .default([]),
      })
    ),
  })
  .passthrough();

const CLERK_USER_ARRAY_SCHEMA = z.array(
  z.object({
    id: z.string(),
    primary_email_address_id: z.string().nullable().optional(),
    email_addresses: z
      .array(
        z.object({
          id: z.string(),
          email_address: z.string().email(),
        })
      )
      .default([]),
  })
);

const SEED_VERSION = "local-demo-v1";
const SEED_MARKER_PREFIX = "local-seed:demo:v1:";
const SEED_NOTE_TAG = "[local-demo-v1]";

type AppBindings = {
  Bindings: Env;
  Variables: { requestId: string };
};

type DemoPurchaseSeed = {
  title: string;
  merchant: string;
  category:
    | "electronics"
    | "appliances"
    | "furniture"
    | "clothing"
    | "vehicle"
    | "home_improvement"
    | "services"
    | "other";
  purchaseDate: string;
  amountMinor: number;
  currency: "USD";
  orderNumber: string;
  notes: string;
  deliveryStatus: "ordered" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string | null;
  carrier?: string | null;
  warrantyExpiresAt?: string | null;
  returnDeadlineAt?: string | null;
  claims?: Array<{
    type: "return" | "refund" | "warranty";
    status:
      | "draft"
      | "submitted"
      | "in_progress"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled";
    openedAt: string;
    resolvedAt?: string | null;
    refundAmountMinor?: number | null;
    reference?: string | null;
    notes?: string | null;
  }>;
  receiptCount?: number;
  reminderHistory?: Array<{
    kind: "warranty_expiry" | "return_deadline";
    sentAt: string;
    dismissedAt?: string | null;
  }>;
};

const DEMO_PURCHASES: DemoPurchaseSeed[] = [
  {
    title: "Sony WH-1000XM6 Headphones",
    merchant: "Amazon",
    category: "electronics",
    purchaseDate: "2026-08-21",
    amountMinor: 42800,
    currency: "USD",
    orderNumber: "ABY-1001",
    notes: `${SEED_NOTE_TAG} Daily-driver headphones for travel and calls.`,
    deliveryStatus: "delivered",
    trackingNumber: "1Z999AA10123456784",
    carrier: "UPS",
    warrantyExpiresAt: "2027-08-21",
    returnDeadlineAt: "2026-09-04",
    claims: [
      {
        type: "warranty",
        status: "in_progress",
        openedAt: "2026-08-27T15:10:00.000Z",
        reference: "SONY-SVC-1842",
        notes: "Right ear cup occasionally disconnects on multipoint.",
      },
    ],
    receiptCount: 1,
    reminderHistory: [
      {
        kind: "return_deadline",
        sentAt: "2026-08-28T09:00:00.000Z",
      },
    ],
  },
  {
    title: "Breville Barista Express",
    merchant: "Best Buy",
    category: "appliances",
    purchaseDate: "2026-08-24",
    amountMinor: 69995,
    currency: "USD",
    orderNumber: "ABY-1002",
    notes: `${SEED_NOTE_TAG} Kitchen upgrade for home espresso.`,
    deliveryStatus: "shipped",
    trackingNumber: "9400111899223857123456",
    carrier: "USPS",
    warrantyExpiresAt: "2028-08-24",
    returnDeadlineAt: "2026-09-07",
    receiptCount: 1,
    reminderHistory: [
      {
        kind: "return_deadline",
        sentAt: "2026-08-27T10:15:00.000Z",
      },
    ],
  },
  {
    title: "Article Culla Walnut Desk",
    merchant: "Article",
    category: "furniture",
    purchaseDate: "2026-08-10",
    amountMinor: 89900,
    currency: "USD",
    orderNumber: "ABY-1003",
    notes: `${SEED_NOTE_TAG} Office refresh for the spare bedroom.`,
    deliveryStatus: "delivered",
    warrantyExpiresAt: "2027-08-10",
    returnDeadlineAt: "2026-08-31",
  },
  {
    title: "Nike Pegasus 41",
    merchant: "Nike",
    category: "clothing",
    purchaseDate: "2026-08-03",
    amountMinor: 12900,
    currency: "USD",
    orderNumber: "ABY-1004",
    notes: `${SEED_NOTE_TAG} Running shoes for weekday mileage.`,
    deliveryStatus: "delivered",
    returnDeadlineAt: "2026-08-30",
    claims: [
      {
        type: "return",
        status: "completed",
        openedAt: "2026-08-11T16:15:00.000Z",
        resolvedAt: "2026-08-15T18:45:00.000Z",
        refundAmountMinor: 12900,
        reference: "NKE-RET-9081",
        notes: "Sizing ran long; swapped for half-size down in store.",
      },
    ],
    reminderHistory: [
      {
        kind: "return_deadline",
        sentAt: "2026-08-25T13:45:00.000Z",
      },
    ],
  },
  {
    title: "Michelin Defender 2 Tire Set",
    merchant: "Costco Tire Center",
    category: "vehicle",
    purchaseDate: "2026-07-19",
    amountMinor: 74236,
    currency: "USD",
    orderNumber: "ABY-1005",
    notes: `${SEED_NOTE_TAG} Replaced all four tires before a road trip.`,
    deliveryStatus: "delivered",
    warrantyExpiresAt: "2031-07-19",
  },
  {
    title: "Ring Battery Doorbell Plus",
    merchant: "Home Depot",
    category: "home_improvement",
    purchaseDate: "2026-08-27",
    amountMinor: 17999,
    currency: "USD",
    orderNumber: "ABY-1006",
    notes: `${SEED_NOTE_TAG} Front porch camera for package coverage.`,
    deliveryStatus: "ordered",
    warrantyExpiresAt: "2027-08-27",
    returnDeadlineAt: "2026-09-10",
  },
  {
    title: "Figma Professional Annual Plan",
    merchant: "Figma",
    category: "services",
    purchaseDate: "2026-08-01",
    amountMinor: 18000,
    currency: "USD",
    orderNumber: "ABY-1007",
    notes: `${SEED_NOTE_TAG} Renewed design tooling for freelance work.`,
    deliveryStatus: "delivered",
    claims: [
      {
        type: "refund",
        status: "approved",
        openedAt: "2026-08-05T12:00:00.000Z",
        resolvedAt: "2026-08-06T14:30:00.000Z",
        refundAmountMinor: 6000,
        reference: "FIG-CR-5531",
        notes: "Unused editor seat credited back after billing review.",
      },
    ],
  },
  {
    title: "REI Trail 40 Pack",
    merchant: "REI",
    category: "other",
    purchaseDate: "2026-08-14",
    amountMinor: 15900,
    currency: "USD",
    orderNumber: "ABY-1008",
    notes: `${SEED_NOTE_TAG} Weekend hiking pack.`,
    deliveryStatus: "delivered",
    returnDeadlineAt: "2026-09-01",
    receiptCount: 1,
  },
  {
    title: "Anker Prime USB-C Dock",
    merchant: "Anker",
    category: "electronics",
    purchaseDate: "2026-08-12",
    amountMinor: 24999,
    currency: "USD",
    orderNumber: "ABY-1009",
    notes: `${SEED_NOTE_TAG} Travel desk docking setup.`,
    deliveryStatus: "cancelled",
    claims: [
      {
        type: "refund",
        status: "cancelled",
        openedAt: "2026-08-13T09:30:00.000Z",
        resolvedAt: "2026-08-13T10:00:00.000Z",
        reference: "ANK-CAN-3210",
        notes: "Merchant cancelled before shipment after inventory issue.",
      },
    ],
  },
  {
    title: "Patio Heater Cover",
    merchant: "Target",
    category: "other",
    purchaseDate: "2026-08-25",
    amountMinor: 4599,
    currency: "USD",
    orderNumber: "ABY-1010",
    notes: `${SEED_NOTE_TAG} Outdoor storage cover before monsoon season.`,
    deliveryStatus: "shipped",
    trackingNumber: "TGT9384756102",
    carrier: "FedEx",
    returnDeadlineAt: "2026-09-08",
    reminderHistory: [
      {
        kind: "return_deadline",
        sentAt: "2026-07-20T11:30:00.000Z",
      },
    ],
  },
];

const SAMPLE_GIF_BYTES = Uint8Array.from(
  atob("R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs="),
  (char) => char.charCodeAt(0)
);

export function registerDevRoutes(app: OpenAPIHono<AppBindings>) {
  app.post("/dev/seed-demo-user", async (c) => {
    if (c.env.APP_STAGE !== "local") {
      return apiError(c, 404, "not_found", "Route not found");
    }

    const headerToken = c.req.header("x-local-seed-token");
    const expectedToken = c.env.LOCAL_AUTH_TOKEN;
    if (!expectedToken || headerToken !== expectedToken) {
      return apiError(c, 401, "unauthenticated", "Invalid local seed token");
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return apiError(c, 422, "validation_failed", "Invalid JSON body");
    }

    const parsed = seedRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(c, 422, "validation_failed", "Validation failed", {
        fields: zodFields(parsed.error),
      });
    }

    if (!c.env.CLERK_SECRET_KEY) {
      return apiError(
        c,
        503,
        "unavailable",
        "CLERK_SECRET_KEY is required for local seeding"
      );
    }

    const clerkUser = await findClerkUserByEmail(
      parsed.data.email,
      c.env.CLERK_SECRET_KEY
    );
    if (!clerkUser) {
      return apiError(c, 404, "not_found", "Clerk user not found");
    }

    const db = createDbClient(c.env.DB);
    const user = await cachedFindOrProvisionUser(c.env, db, clerkUser.id, {
      email: parsed.data.email,
      timezone: "UTC",
    });

    const markerKey = `${SEED_MARKER_PREFIX}${user.id}`;
    const existingMarker = await c.env.APP_KV.get(markerKey);
    if (existingMarker) {
      return c.json({
        status: "already_seeded" as const,
        seedVersion: SEED_VERSION,
        userId: user.id,
        clerkUserId: user.clerkUserId,
        email: parsed.data.email,
        counts: {
          purchases: 0,
          claims: 0,
          receipts: 0,
          reminders: 0,
        },
      });
    }

    const counts = await seedDemoData(c.env, user, parsed.data.includeReceipts);

    await c.env.APP_KV.put(
      markerKey,
      JSON.stringify({
        seededAt: new Date().toISOString(),
        seedVersion: SEED_VERSION,
        email: parsed.data.email,
      })
    );

    return c.json({
      status: "seeded" as const,
      seedVersion: SEED_VERSION,
      userId: user.id,
      clerkUserId: user.clerkUserId,
      email: parsed.data.email,
      counts,
    });
  });
}

async function findClerkUserByEmail(
  email: string,
  secretKey: string
): Promise<{ id: string } | null> {
  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.append("limit", "1");
  url.searchParams.append("email_address[]", email);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Clerk user lookup failed with status ${response.status}`);
  }

  const json = await response.json();
  const listResult = CLERK_USER_LIST_SCHEMA.safeParse(json);
  if (listResult.success) {
    return pickMatchingClerkUser(listResult.data.data, email);
  }

  const arrayResult = CLERK_USER_ARRAY_SCHEMA.safeParse(json);
  if (arrayResult.success) {
    return pickMatchingClerkUser(arrayResult.data, email);
  }

  throw new Error("Unexpected Clerk user list response");
}

function pickMatchingClerkUser(
  users: Array<{
    id: string;
    primary_email_address_id?: string | null | undefined;
    email_addresses: Array<{ id: string; email_address: string }>;
  }>,
  email: string
): { id: string } | null {
  const normalized = email.trim().toLowerCase();

  for (const user of users) {
    const primary = user.email_addresses.find(
      (item) => item.id === user.primary_email_address_id
    );
    if (primary && primary.email_address.toLowerCase() === normalized) {
      return { id: user.id };
    }
  }

  for (const user of users) {
    if (
      user.email_addresses.some(
        (item) => item.email_address.toLowerCase() === normalized
      )
    ) {
      return { id: user.id };
    }
  }

  return users[0] ? { id: users[0].id } : null;
}

async function seedDemoData(
  env: Env,
  user: AuthedUser,
  includeReceipts: boolean
): Promise<{
  purchases: number;
  claims: number;
  receipts: number;
  reminders: number;
}> {
  const db = createDbClient(env.DB);
  let purchaseCount = 0;
  let claimCount = 0;
  let receiptCount = 0;

  for (const seed of DEMO_PURCHASES) {
    const now = new Date(`${seed.purchaseDate}T12:00:00.000Z`).toISOString();
    const purchaseId = uuidv7();

    await db.insert(purchases).values({
      id: purchaseId,
      userId: user.id,
      title: seed.title,
      merchant: seed.merchant,
      category: seed.category,
      purchaseDate: seed.purchaseDate,
      amountMinor: seed.amountMinor,
      currency: seed.currency,
      orderNumber: seed.orderNumber,
      notes: seed.notes,
      deliveryStatus: seed.deliveryStatus,
      trackingNumber: seed.trackingNumber ?? null,
      carrier: seed.carrier ?? null,
      warrantyExpiresAt: seed.warrantyExpiresAt ?? null,
      returnDeadlineAt: seed.returnDeadlineAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    purchaseCount += 1;

    await onPurchaseMutated(env, db, purchaseId);

    for (const historySeed of seed.reminderHistory ?? []) {
      await db
        .update(reminders)
        .set({
          sentAt: historySeed.sentAt,
          dismissedAt: historySeed.dismissedAt ?? null,
        })
        .where(
          and(
            eq(reminders.purchaseId, purchaseId),
            eq(reminders.kind, historySeed.kind)
          )
        );
    }

    for (const claimSeed of seed.claims ?? []) {
      await db.insert(claims).values({
        id: uuidv7(),
        userId: user.id,
        purchaseId,
        type: claimSeed.type,
        status: claimSeed.status,
        openedAt: claimSeed.openedAt,
        resolvedAt: claimSeed.resolvedAt ?? null,
        refundAmountMinor: claimSeed.refundAmountMinor ?? null,
        reference: claimSeed.reference ?? null,
        notes: claimSeed.notes ?? null,
        createdAt: claimSeed.openedAt,
        updatedAt: claimSeed.resolvedAt ?? claimSeed.openedAt,
      });
      claimCount += 1;
    }

    if (includeReceipts) {
      const wantedReceipts = seed.receiptCount ?? 0;
      for (let index = 0; index < wantedReceipts; index += 1) {
        const receiptId = uuidv7();
        const r2Key = `receipts/${user.id}/${purchaseId}/${receiptId}.gif`;
        await env.STORAGE.put(r2Key, SAMPLE_GIF_BYTES, {
          httpMetadata: { contentType: "image/gif" },
          customMetadata: {
            userId: user.id,
            purchaseId,
          },
        });
        await db.insert(receipts).values({
          id: receiptId,
          purchaseId,
          userId: user.id,
          r2Key,
          contentType: "image/gif",
          sizeBytes: SAMPLE_GIF_BYTES.byteLength,
          width: 1,
          height: 1,
          createdAt: now,
        });
        receiptCount += 1;
      }
    }
  }

  const reminderRows = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(eq(reminders.userId, user.id));

  return {
    purchases: purchaseCount,
    claims: claimCount,
    receipts: receiptCount,
    reminders: reminderRows.length,
  };
}

function zodFields(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] = issue.message;
  }
  return out;
}
