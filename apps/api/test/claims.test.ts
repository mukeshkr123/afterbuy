import { describe, expect, test } from "vitest";
import { requestApp } from "./test-helpers";

describe("claims API", () => {
  async function createTestPurchase() {
    const res = await requestApp("/v1/purchases", "POST", {
      title: "Test Purchase for Claim",
      merchant: "Amazon",
      category: "electronics",
      purchaseDate: "2026-07-18",
      amountMinor: 1000,
      currency: "USD",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    return body.id as string;
  }

  test("creates, lists, and patches a claim successfully", async () => {
    const purchaseId = await createTestPurchase();

    // 1. Create claim
    const resCreate = await requestApp("/v1/claims", "POST", {
      purchaseId,
      type: "refund",
      status: "draft",
      refundAmountMinor: 500,
      notes: "Item damaged",
    });
    expect(resCreate.status).toBe(201);
    const claim = await resCreate.json();
    expect(claim.id).toBeTypeOf("string");
    expect(claim.type).toBe("refund");
    expect(claim.status).toBe("draft");
    expect(claim.refundAmountMinor).toBe(500);

    // 2. List claims
    const resList = await requestApp(
      `/v1/claims?purchaseId=${purchaseId}`,
      "GET"
    );
    expect(resList.status).toBe(200);
    const listBody = await resList.json();
    expect(listBody.items.length).toBe(1);
    expect(listBody.items[0].id).toBe(claim.id);

    // 3. Patch claim (allowed transition: draft -> submitted)
    const resPatch1 = await requestApp(`/v1/claims/${claim.id}`, "PATCH", {
      status: "submitted",
    });
    expect(resPatch1.status).toBe(200);
    const updated1 = await resPatch1.json();
    expect(updated1.status).toBe("submitted");

    // 4. Fail patching claim with invalid transition (submitted -> draft)
    const resPatch2 = await requestApp(`/v1/claims/${claim.id}`, "PATCH", {
      status: "draft",
    });
    expect(resPatch2.status).toBe(422); // Transition from submitted to draft is forbidden
  });

  test("returns 404 when creating a claim for non-existent purchase", async () => {
    const res = await requestApp("/v1/claims", "POST", {
      purchaseId: "non-existent-uuid",
      type: "refund",
      status: "draft",
    });
    expect(res.status).toBe(404);
  });
});
