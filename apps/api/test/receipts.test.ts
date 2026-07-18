import { describe, expect, test } from "vitest";
import { requestApp } from "./test-helpers";

describe("receipts API", () => {
  async function createTestPurchase() {
    const res = await requestApp("/v1/purchases", "POST", {
      title: "Test Purchase for Receipt",
      merchant: "Amazon",
      category: "electronics",
      purchaseDate: "2026-07-18",
      amountMinor: 2999,
      currency: "USD",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    return body.id as string;
  }

  test("uploads, redirects, views, and deletes a receipt successfully", async () => {
    const purchaseId = await createTestPurchase();

    // 1. Upload receipt
    const formData = new FormData();
    const mockFile = new File(["fake-jpeg-data"], "receipt.jpg", {
      type: "image/jpeg",
    });
    formData.append("file", mockFile);

    const resUpload = await requestApp(
      `/v1/purchases/${purchaseId}/receipts`,
      "POST",
      formData
    );
    if (resUpload.status !== 201) {
      console.log("RECEIPT UPLOAD FAILED BODY:", await resUpload.text());
    }
    expect(resUpload.status).toBe(201);
    const receipt = await resUpload.json();
    expect(receipt.id).toBeTypeOf("string");
    expect(receipt.contentType).toBe("image/jpeg");
    expect(receipt.sizeBytes).toBe(14); // length of 'fake-jpeg-data'

    // 2. Get signed redirect URL
    const resGet = await requestApp(`/v1/receipts/${receipt.id}`, "GET");
    expect(resGet.status).toBe(302);
    const redirectUrl = resGet.headers.get("Location");
    expect(redirectUrl).toContain(`/v1/receipts/${receipt.id}/view`);

    // Parse signature query parameters
    const urlObj = new URL(redirectUrl!, "https://example.com");
    const tokenParam = urlObj.searchParams.get("token");
    const expiresParam = urlObj.searchParams.get("expires");
    expect(tokenParam).toBeTypeOf("string");
    expect(expiresParam).toBeTypeOf("string");

    // 3. View receipt unauthenticated (using the signed path)
    const resView = await requestApp(
      `/v1/receipts/${receipt.id}/view?token=${tokenParam}&expires=${expiresParam}`,
      "GET"
    );
    expect(resView.status).toBe(200);
    expect(await resView.text()).toBe("fake-jpeg-data");

    // 4. Delete receipt
    const resDel = await requestApp(`/v1/receipts/${receipt.id}`, "DELETE");
    expect(resDel.status).toBe(204);
  });

  test("returns 422 for unsupported file extensions", async () => {
    const purchaseId = await createTestPurchase();
    const formData = new FormData();
    const mockFile = new File(["fake-pdf-data"], "document.pdf", {
      type: "application/pdf",
    });
    formData.append("file", mockFile);

    const resUpload = await requestApp(
      `/v1/purchases/${purchaseId}/receipts`,
      "POST",
      formData
    );
    expect(resUpload.status).toBe(422);
  });
});
