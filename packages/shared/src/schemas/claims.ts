import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });

export const claimTypeSchema = z.enum(["return", "refund", "warranty"]);
export type ClaimType = z.infer<typeof claimTypeSchema>;

export const claimStatusSchema = z.enum([
  "draft",
  "submitted",
  "in_progress",
  "approved",
  "rejected",
  "completed",
  "cancelled",
]);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;

export const claimSchema = z.object({
  id: z.string(),
  userId: z.string(),
  purchaseId: z.string(),
  type: claimTypeSchema,
  status: claimStatusSchema,
  openedAt: isoDateTime,
  resolvedAt: isoDateTime.nullable(),
  refundAmountMinor: z.number().int().nonnegative().nullable(),
  reference: z.string().max(200).nullable(),
  notes: z.string().max(5000).nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Claim = z.infer<typeof claimSchema>;

export const createClaimRequestSchema = z.object({
  purchaseId: z.string(),
  type: claimTypeSchema,
  status: claimStatusSchema.optional().default("draft"),
  openedAt: isoDateTime.optional(),
  refundAmountMinor: z.number().int().nonnegative().optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateClaimRequest = z.infer<typeof createClaimRequestSchema>;

export const updateClaimRequestSchema = z.object({
  type: claimTypeSchema.optional(),
  status: claimStatusSchema.optional(),
  openedAt: isoDateTime.optional(),
  resolvedAt: isoDateTime.optional().nullable(),
  refundAmountMinor: z.number().int().nonnegative().optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpdateClaimRequest = z.infer<typeof updateClaimRequestSchema>;
