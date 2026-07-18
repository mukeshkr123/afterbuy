import { z } from "zod";
import type { ApiRequest } from "./client";

// Phase 6 stubs claims. The endpoint ships in Phase 7; until then callers
// get an empty list so the detail screen can render an "Open a claim" CTA
// without breaking.
const claimSchema = z.object({
  id: z.string(),
  purchaseId: z.string(),
  kind: z.enum(["return", "refund", "warranty"]),
  status: z.enum(["draft", "submitted", "in_review", "resolved", "rejected"]),
  openedAt: z.string(),
  resolvedAt: z.string().nullable(),
});

const claimsListResponseSchema = z.object({
  items: z.array(claimSchema),
});

export type Claim = z.infer<typeof claimSchema>;

export function listClaims(
  api: ApiRequest,
  q: { purchaseId?: string } = {}
): Promise<{ items: Claim[] }> {
  return api({
    method: "GET",
    path: "/v1/claims",
    query: q,
    schema: claimsListResponseSchema,
  }) as Promise<{ items: Claim[] }>;
}
