import {
  claimSchema,
  createClaimRequestSchema,
  updateClaimRequestSchema,
  type Claim,
  type CreateClaimRequest,
  type UpdateClaimRequest,
} from "@acme/shared";
import { z } from "zod";
import type { ApiRequest } from "./client";

const listResponse = z.object({ items: z.array(claimSchema) });

export type { Claim, CreateClaimRequest, UpdateClaimRequest };

export function listClaims(
  api: ApiRequest,
  q: { purchaseId?: string | undefined } = {}
): Promise<{ items: Claim[] }> {
  return api({
    method: "GET",
    path: "/v1/claims",
    query: q,
    schema: listResponse,
  }) as Promise<{ items: Claim[] }>;
}

export function getClaim(api: ApiRequest, id: string): Promise<Claim> {
  return api({
    method: "GET",
    path: `/v1/claims/${encodeURIComponent(id)}`,
    schema: claimSchema,
  }) as Promise<Claim>;
}

export function createClaim(
  api: ApiRequest,
  body: CreateClaimRequest
): Promise<Claim> {
  createClaimRequestSchema.parse(body);
  return api({
    method: "POST",
    path: "/v1/claims",
    body,
    schema: claimSchema,
  }) as Promise<Claim>;
}

export function patchClaim(
  api: ApiRequest,
  id: string,
  body: UpdateClaimRequest
): Promise<Claim> {
  updateClaimRequestSchema.parse(body);
  return api({
    method: "PATCH",
    path: `/v1/claims/${encodeURIComponent(id)}`,
    body,
    schema: claimSchema,
  }) as Promise<Claim>;
}

// Re-export zod used elsewhere if needed
export { z };
