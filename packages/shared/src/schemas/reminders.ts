import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO-8601 date (YYYY-MM-DD)");

const isoDateTime = z.string().datetime({ offset: true });

export const reminderKindSchema = z.enum([
  "warranty_expiry",
  "return_deadline",
]);

export const reminderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  purchaseId: z.string(),
  kind: reminderKindSchema,
  fireOn: isoDate,
  sentAt: isoDateTime.nullable(),
  dismissedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});

export type Reminder = z.infer<typeof reminderSchema>;
