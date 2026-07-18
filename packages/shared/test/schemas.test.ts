import { describe, expect, test } from "vitest";
import { purchaseSchema, healthCheckResponseSchema } from "../src";

describe("shared schemas", () => {
  test("validates purchase payloads", () => {
    const raw = {
      id: "purchase-1",
      userId: "user-1",
      title: "New Purchase",
      merchant: "Amazon",
      category: "electronics",
      purchaseDate: "2026-07-18",
      amountMinor: 1000,
      currency: "USD",
      orderNumber: "123-456",
      notes: "some notes",
      deliveryStatus: "ordered",
      trackingNumber: "tracking-1",
      carrier: "FedEx",
      warrantyExpiresAt: "2027-07-18",
      returnDeadlineAt: "2026-08-18",
      createdAt: "2026-07-18T14:00:00Z",
      updatedAt: "2026-07-18T14:00:00Z",
    };
    expect(purchaseSchema.parse(raw)).toEqual(raw);
  });

  test("validates degraded health responses", () => {
    const parsed = healthCheckResponseSchema.parse({
      status: "degraded",
      stage: "prod",
      requestId: "req-1",
      checks: {
        database: true,
        storage: true,
        queue: true,
        cors: false,
        optionalWebhookSecret: false,
        clerkAuthConfigured: false,
      },
      degradedReasons: ["ALLOWED_ORIGINS is empty"],
    });

    expect(parsed.status).toBe("degraded");
  });
});
