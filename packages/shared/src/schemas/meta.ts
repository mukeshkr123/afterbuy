import { z } from "zod";
import { purchaseCategorySchema } from "./purchases";

export const categoryMetaSchema = z.object({
  category: purchaseCategorySchema,
  defaultReturnDays: z.number().int().nonnegative(),
  defaultWarrantyDays: z.number().int().nonnegative(),
});

export type CategoryMeta = z.infer<typeof categoryMetaSchema>;

export const categoryMetaListResponseSchema = z.object({
  items: z.array(categoryMetaSchema),
});

export type CategoryMetaListResponse = z.infer<
  typeof categoryMetaListResponseSchema
>;
