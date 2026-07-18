import { describe, expect, test } from "vitest";
import { requestApp } from "./test-helpers";

describe("reminders API & derivation", () => {
  test("derives reminders on purchase creation, lists, and dismisses them", async () => {
    // 1. Create a purchase with deadlines
    const resCreate = await requestApp("/v1/purchases", "POST", {
      title: "Gadget with Deadlines",
      merchant: "Best Buy",
      category: "electronics",
      purchaseDate: "2026-07-18",
      amountMinor: 15000,
      currency: "USD",
      warrantyExpiresAt: "2027-07-18", // 1 year warranty
      returnDeadlineAt: "2026-08-18", // 1 month return window
    });
    expect(resCreate.status).toBe(201);
    const purchase = await resCreate.json();

    // Check that reminders are derived immediately on create
    expect(purchase.reminders.length).toBe(2);

    const returnReminder = purchase.reminders.find(
      (r: any) => r.kind === "return_deadline"
    );
    const warrantyReminder = purchase.reminders.find(
      (r: any) => r.kind === "warranty_expiry"
    );
    expect(returnReminder).toBeDefined();
    expect(warrantyReminder).toBeDefined();

    // Default reminderLeadDays is 7, so fireOn should be date - 7 days
    // "2026-08-18" - 7 days = "2026-08-11"
    expect(returnReminder.fireOn).toBe("2026-08-11");
    // "2027-07-18" - 7 days = "2027-07-11"
    expect(warrantyReminder.fireOn).toBe("2027-07-11");

    // 2. List upcoming reminders
    const resList = await requestApp("/v1/reminders?scope=upcoming", "GET");
    expect(resList.status).toBe(200);
    const listBody = await resList.json();
    expect(listBody.items.length).toBeGreaterThanOrEqual(2);

    // 3. Dismiss a reminder
    const resDismiss = await requestApp(
      `/v1/reminders/${returnReminder.id}/dismiss`,
      "POST"
    );
    expect(resDismiss.status).toBe(200);
    const dismissBody = await resDismiss.json();
    expect(dismissBody.dismissedAt).toBeTypeOf("string");

    // 4. Verify it's no longer listed in upcoming
    const resList2 = await requestApp("/v1/reminders?scope=upcoming", "GET");
    const listBody2 = await resList2.json();
    const found = listBody2.items.some((r: any) => r.id === returnReminder.id);
    expect(found).toBe(false);
  });

  test("re-calculates reminders when user's reminderLeadDays changes", async () => {
    // 1. Create a purchase with deadline
    const resCreate = await requestApp("/v1/purchases", "POST", {
      title: "LeadDays Test",
      category: "appliances",
      purchaseDate: "2026-07-18",
      returnDeadlineAt: "2026-08-18",
    });
    expect(resCreate.status).toBe(201);
    const p1 = await resCreate.json();
    const r1 = p1.reminders[0];
    expect(r1.fireOn).toBe("2026-08-11"); // default 7 days lead

    // 2. Update user profile's reminderLeadDays to 10 days
    const resProfile = await requestApp("/v1/me", "PATCH", {
      reminderLeadDays: 10,
    });
    expect(resProfile.status).toBe(200);
    const profile = await resProfile.json();
    expect(profile.reminderLeadDays).toBe(10);

    // 3. Query the purchase again to verify reminder fire_on updated to 10 days lead
    // "2026-08-18" - 10 days = "2026-08-08"
    const resGet = await requestApp(`/v1/purchases/${p1.id}`, "GET");
    expect(resGet.status).toBe(200);
    const p2 = await resGet.json();
    expect(p2.reminders[0].fireOn).toBe("2026-08-08");

    // Clean up profile preference back to 7
    await requestApp("/v1/me", "PATCH", {
      reminderLeadDays: 7,
    });
  });
});
