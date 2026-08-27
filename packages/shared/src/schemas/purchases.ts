import { z } from "zod";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_DELIVERY_STATUSES,
  PURCHASE_SORT_KEYS,
} from "../constants/categories";
import { receiptSchema } from "./receipts";

import { claimSchema } from "./claims";
import { reminderSchema } from "./reminders";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO-8601 date (YYYY-MM-DD)");

const isoDateTime = z.string().datetime({ offset: true });

export const purchaseCategorySchema = z.enum(PURCHASE_CATEGORIES);
export const deliveryStatusSchema = z.enum(PURCHASE_DELIVERY_STATUSES);
export const purchaseSortSchema = z
  .enum(PURCHASE_SORT_KEYS)
  .default("createdAt");

export const purchaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  merchant: z.string().max(200).nullable(),
  category: purchaseCategorySchema,
  purchaseDate: isoDate,
  amountMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
  orderNumber: z.string().max(200).nullable(),
  notes: z.string().max(5000).nullable(),
  deliveryStatus: deliveryStatusSchema,
  trackingNumber: z.string().max(200).nullable(),
  carrier: z.string().max(100).nullable(),
  warrantyExpiresAt: isoDate.nullable(),
  returnDeadlineAt: isoDate.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable().optional(),
});

export type Purchase = z.infer<typeof purchaseSchema>;

// Phase 3/4 will populate receipts/claims/reminders. From day one the shape
// stays stable; the arrays default to empty.
export const purchaseDetailResponseSchema = purchaseSchema.extend({
  receipts: z.array(receiptSchema),
  claims: z.array(claimSchema),
  reminders: z.array(reminderSchema),
});

export type PurchaseDetailResponse = z.infer<
  typeof purchaseDetailResponseSchema
>;

export const createPurchaseRequestSchema = z
  .object({
    title: z.string().min(1).max(200),
    merchant: z.string().max(200).nullable().optional(),
    category: purchaseCategorySchema.optional(),
    purchaseDate: isoDate.optional(),
    amountMinor: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().length(3).optional(),
    orderNumber: z.string().max(200).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    deliveryStatus: deliveryStatusSchema.optional(),
    trackingNumber: z.string().max(200).nullable().optional(),
    carrier: z.string().max(100).nullable().optional(),
    warrantyExpiresAt: isoDate.nullable().optional(),
    returnDeadlineAt: isoDate.nullable().optional(),
  })
  .strict();

export type CreatePurchaseRequest = z.infer<typeof createPurchaseRequestSchema>;

export const updatePurchaseRequestSchema =
  createPurchaseRequestSchema.partial();

export type UpdatePurchaseRequest = z.infer<typeof updatePurchaseRequestSchema>;

export const purchaseListQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: purchaseCategorySchema.optional(),
  deliveryStatus: deliveryStatusSchema.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: purchaseSortSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;

export const purchaseListResponseSchema = z.object({
  items: z.array(purchaseSchema),
  nextCursor: z.string().nullable(),
});

export type PurchaseListResponse = z.infer<typeof purchaseListResponseSchema>;
