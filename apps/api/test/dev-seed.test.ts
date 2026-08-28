import { afterEach, describe, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import {
  createDbClient,
  users,
  purchases,
  claims,
  receipts,
  reminders,
} from "@acme/db";
import { createApp } from "../src/app";
import { initTestDb, testEnv } from "./test-helpers";

describe("local demo seed route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns 404 outside local stage", async () => {
    await initTestDb();

    const res = await createApp().request(
      "/dev/seed-demo-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-local-seed-token": "test-token",
        },
        body: JSON.stringify({
          email: "seeded.user@example.com",
          includeReceipts: true,
          mode: "append",
        }),
      },
      testEnv({ APP_STAGE: "test", CLERK_SECRET_KEY: "sk_test_123" })
    );

    expect(res.status).toBe(404);
  });

  test("returns 401 for an invalid local seed token", async () => {
    await initTestDb();

    const res = await createApp().request(
      "/dev/seed-demo-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-local-seed-token": "wrong-token",
        },
        body: JSON.stringify({
          email: "seeded.user@example.com",
          includeReceipts: true,
          mode: "append",
        }),
      },
      testEnv({ APP_STAGE: "local", CLERK_SECRET_KEY: "sk_test_123" })
    );

    expect(res.status).toBe(401);
  });

  test("returns 404 when the Clerk user lookup does not find an email", async () => {
    await initTestDb();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
      )
    );

    const res = await seedRequest("missing.user@example.com");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "not_found" },
    });
  });

  test("seeds a realistic local demo dataset and remains idempotent", async () => {
    await initTestDb();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(input.toString());
        const email = url.searchParams.get("email_address[]");
        return new Response(
          JSON.stringify({
            data: email
              ? [
                  {
                    id: "user_clerk_demo_123",
                    primary_email_address_id: "email_primary_123",
                    email_addresses: [
                      {
                        id: "email_primary_123",
                        email_address: email,
                      },
                    ],
                  },
                ]
              : [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );

    const first = await seedRequest("mukeshmehta2041@gmail.com");
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      status: "seeded",
      seedVersion: "local-demo-v1",
      clerkUserId: "user_clerk_demo_123",
      email: "mukeshmehta2041@gmail.com",
      counts: {
        purchases: 10,
        claims: 4,
        receipts: 3,
        reminders: 12,
      },
    });

    const db = createDbClient(env.DB);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "user_clerk_demo_123"))
      .get();
    expect(user).toBeDefined();
    expect(user?.email).toBe("mukeshmehta2041@gmail.com");

    const purchaseRows = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, user!.id));
    const claimRows = await db
      .select()
      .from(claims)
      .where(eq(claims.userId, user!.id));
    const receiptRows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.userId, user!.id));
    const reminderRows = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, user!.id));

    expect(purchaseRows).toHaveLength(10);
    expect(claimRows).toHaveLength(4);
    expect(receiptRows).toHaveLength(3);
    expect(reminderRows).toHaveLength(12);
    expect(reminderRows.filter((row) => row.sentAt !== null)).toHaveLength(4);
    expect(reminderRows.filter((row) => row.sentAt === null)).toHaveLength(8);

    for (const receipt of receiptRows) {
      const object = await env.STORAGE.get(receipt.r2Key);
      expect(object).not.toBeNull();
    }

    const second = await seedRequest("mukeshmehta2041@gmail.com");
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      status: "already_seeded",
      counts: {
        purchases: 0,
        claims: 0,
        receipts: 0,
        reminders: 0,
      },
    });
  });
});

async function seedRequest(email: string) {
  return createApp().request(
    "/dev/seed-demo-user",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-local-seed-token": "test-token",
      },
      body: JSON.stringify({
        email,
        includeReceipts: true,
        mode: "append",
      }),
    },
    testEnv({ APP_STAGE: "local", CLERK_SECRET_KEY: "sk_test_123" })
  );
}
