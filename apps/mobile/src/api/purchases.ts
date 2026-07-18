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
    schema: purchaseDetailResponseSchema.passthrough(),
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

// Phase 6.4 stub. The expo-image-picker install is deferred because it
// requires an `expo prebuild` round-trip that breaks CI; the uploadReceipt
// signature is in place so the wiring is a one-liner when the picker lands.
export function uploadReceipt(
  api: ApiRequest,
  purchaseId: string,
  file: { uri: string; name: string; type: string }
): Promise<PurchaseDetailResponse> {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  return api({
    method: "POST",
    path: `/v1/purchases/${encodeURIComponent(purchaseId)}/receipts`,
    body: form,
    schema: purchaseDetailResponseSchema,
  }) as Promise<PurchaseDetailResponse>;
}
