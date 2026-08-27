import { describe, expect, test } from "vitest";
import { requestApp } from "./test-helpers";

describe("purchases API", () => {
  async function createPurchase(title: string, amountMinor?: number) {
    const res = await requestApp("/v1/purchases", "POST", {
      title,
      merchant: "AfterBuy",
      category: "electronics",
      purchaseDate: "2026-08-02",
      ...(amountMinor === undefined ? {} : { amountMinor }),
      currency: "USD",
    });
    expect(res.status).toBe(201);
    return (await res.json()) as { id: string };
  }

  test("paginates null amounts when sorting by amount", async () => {
    const prefix = `amountcursor${Date.now()}`;
    await createPurchase(`${prefix} known`, 5000);
    const nullOne = await createPurchase(`${prefix} unknown one`);
    const nullTwo = await createPurchase(`${prefix} unknown two`);

    const firstPage = await requestApp(
      `/v1/purchases?sort=amount&limit=1&q=${encodeURIComponent(prefix)}`,
      "GET"
    );
    expect(firstPage.status).toBe(200);
    const firstBody = await firstPage.json();
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.nextCursor).toBeTypeOf("string");

    const secondPage = await requestApp(
      `/v1/purchases?sort=amount&limit=10&q=${encodeURIComponent(
        prefix
      )}&cursor=${firstBody.nextCursor}`,
      "GET"
    );
    expect(secondPage.status).toBe(200);
    const secondBody = await secondPage.json();
    const ids = secondBody.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(nullOne.id);
    expect(ids).toContain(nullTwo.id);
  });
});
