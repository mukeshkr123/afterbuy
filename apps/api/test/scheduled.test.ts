import { describe, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { handleScheduled } from "../src/scheduled";
import { requestApp, testEnv, initTestDb } from "./test-helpers";
import { createDbClient, reminders, users, purchases } from "@acme/db";
import { eq } from "drizzle-orm";

describe("scheduled daily cron scans", () => {
  test("queues reminders based on user local timezone date rolling window", async () => {
    await initTestDb();
    await requestApp("/v1/me");
    const db = createDbClient(env.DB);

    // 1. Setup two users: one in Asia/Tokyo, one in America/New_York
    // We update the local dev user's timezone to Asia/Tokyo
    const userLocal = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "user_local_dev"))
      .get();
    expect(userLocal).toBeDefined();

    // Create another user in America/New_York
    const nyUserId = crypto.randomUUID();
    await db.insert(users).values({
      id: nyUserId,
      clerkUserId: "user_ny",
      email: "ny@acme.com",
      reminderLeadDays: 7,
      pushEnabled: 1,
      timezone: "America/New_York",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update local dev user timezone to Asia/Tokyo
    await db
      .update(users)
      .set({ timezone: "Asia/Tokyo" })
      .where(eq(users.id, userLocal!.id));

    // Create a purchase for Tokyo user and one for NY user
    const tokyoPurchaseId = crypto.randomUUID();
    await db.insert(purchases).values({
      id: tokyoPurchaseId,
      userId: userLocal!.id,
      title: "Tokyo Item",
      purchaseDate: "2026-07-18",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const nyPurchaseId = crypto.randomUUID();
    await db.insert(purchases).values({
      id: nyPurchaseId,
      userId: nyUserId,
      title: "NY Item",
      purchaseDate: "2026-07-18",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create return reminders for both.
    // Let's assume today is 2026-07-18. We set return deadline reminder fireOn date:
    // - Tokyo reminder fireOn: "2026-07-18" (eligible today in Tokyo)
    // - NY reminder fireOn: "2026-07-19" (NOT eligible today in NY)
    const tokyoReminderId = crypto.randomUUID();
    await db.insert(reminders).values({
      id: tokyoReminderId,
      userId: userLocal!.id,
      purchaseId: tokyoPurchaseId,
      kind: "return_deadline",
      fireOn: "2026-07-18",
      createdAt: new Date().toISOString(),
    });

    const nyReminderId = crypto.randomUUID();
    await db.insert(reminders).values({
      id: nyReminderId,
      userId: nyUserId,
      purchaseId: nyPurchaseId,
      kind: "return_deadline",
      fireOn: "2026-07-19",
      createdAt: new Date().toISOString(),
    });

    // Spy on Queue send
    const sendSpy = vi.spyOn(env.REMINDER_QUEUE, "send");

    // 2. Set system clock to a fixed time where it is:
    // UTC: 2026-07-18 16:00:00
    // Tokyo: UTC+9 = 2026-07-19 01:00:00 (Local date: 2026-07-19, which is >= fireOn "2026-07-18" -> Should Fire!)
    // New York: UTC-4 = 2026-07-18 12:00:00 (Local date: 2026-07-18, which is < fireOn "2026-07-19" -> Should NOT Fire!)
    const mockDate = new Date("2026-07-18T16:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Trigger scheduled cron
    const cronExpr = testEnv().DAILY_CRON_EXPRESSION;
    await handleScheduled(testEnv(), {
      cron: cronExpr,
      scheduledTime: mockDate.getTime(),
    });

    // Restore timers
    vi.useRealTimers();

    // 3. Assertions
    // Tokyo reminder should have been enqueued
    const tokyoSent = sendSpy.mock.calls.some((call: any) => {
      const payload = call[0];
      return payload.reminderId === tokyoReminderId;
    });
    expect(tokyoSent).toBe(true);

    // NY reminder should NOT have been enqueued
    const nySent = sendSpy.mock.calls.some((call: any) => {
      const payload = call[0];
      return payload.reminderId === nyReminderId;
    });
    expect(nySent).toBe(false);

    // Reset spy
    sendSpy.mockRestore();
  });
});
