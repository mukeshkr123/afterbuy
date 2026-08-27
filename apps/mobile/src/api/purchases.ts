import {
  createPurchaseRequestSchema,
  purchaseDetailResponseSchema,
  purchaseListResponseSchema,
  updatePurchaseRequestSchema,
  type CreatePurchaseRequest,
  type PurchaseDetailResponse,
  type PurchaseListResponse,
  type UpdatePurchaseRequest,
} from "@acme/shared";
import { z } from "zod";
import type { ApiRequest } from "./client";

export interface ListPurchasesQuery {
  q?: string | undefined;
  category?: string | undefined;
  deliveryStatus?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  sort?: "purchaseDate" | "createdAt" | "amount" | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
  [key: string]: string | number | undefined;
}

export function listPurchases(
  api: ApiRequest,
  query: ListPurchasesQuery = {}
): Promise<PurchaseListResponse> {
  return api({
    method: "GET",
    path: "/v1/purchases",
    query,
    schema: purchaseListResponseSchema,
  }) as Promise<PurchaseListResponse>;
}

export function getPurchase(
  api: ApiRequest,
  id: string
): Promise<PurchaseDetailResponse> {
  return api({
    method: "GET",
    path: `/v1/purchases/${encodeURIComponent(id)}`,
    schema: purchaseDetailResponseSchema,
  }) as Promise<PurchaseDetailResponse>;
}

export function createPurchase(
  api: ApiRequest,
  body: CreatePurchaseRequest
): Promise<PurchaseDetailResponse> {
  createPurchaseRequestSchema.parse(body);
  return api({
    method: "POST",
    path: "/v1/purchases",
    body,
    schema: purchaseDetailResponseSchema,
  }) as Promise<PurchaseDetailResponse>;
}

export function patchPurchase(
  api: ApiRequest,
  id: string,
  body: UpdatePurchaseRequest
): Promise<PurchaseDetailResponse> {
  updatePurchaseRequestSchema.parse(body);
  return api({
    method: "PATCH",
    path: `/v1/purchases/${encodeURIComponent(id)}`,
    body,
    schema: purchaseDetailResponseSchema,
  }) as Promise<PurchaseDetailResponse>;
}

export async function deletePurchase(
  api: ApiRequest,
  id: string
): Promise<void> {
  await api({
    method: "DELETE",
    path: `/v1/purchases/${encodeURIComponent(id)}`,
    schema: z.void(),
  });
}

export function restorePurchase(
  api: ApiRequest,
  id: string
): Promise<PurchaseDetailResponse> {
  return api({
    method: "POST",
    path: `/v1/purchases/${encodeURIComponent(id)}/restore`,
    schema: purchaseDetailResponseSchema,
  }) as Promise<PurchaseDetailResponse>;
}

// Receipt upload lives in ./receipts.ts — it returns a Receipt, not a
// Purchase, and needs `bodyKind: "multipart"` to skip JSON serialization.
