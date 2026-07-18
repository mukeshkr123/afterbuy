import { z } from "zod";

export const receiptSchema = z.object({
  id: z.string(),
  purchaseId: z.string(),
  userId: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Receipt = z.infer<typeof receiptSchema>;

export const uploadReceiptResponseSchema = receiptSchema;
export type UploadReceiptResponse = z.infer<typeof uploadReceiptResponseSchema>;
