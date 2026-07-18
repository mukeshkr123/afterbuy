import type { ApiRequest } from "./client";
import { z } from "zod";

// Phase 6 ships a stub. The schema lands in Phase 4; until then this
// returns the envelope-shaped empty list so callers can wire UI.
const reminderSchema = z.object({
  id: z.string(),
  purchaseId: z.string(),
  kind: z.enum(["warranty_expiry", "return_deadline"]),
  fireOn: z.string(),
  sentAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
});

const remindersResponseSchema = z.object({
  items: z.array(reminderSchema),
});

export type Reminder = z.infer<typeof reminderSchema>;

export async function getReminders(
  api: ApiRequest,
  scope: "upcoming" | "history"
): Promise<{ items: Reminder[] }> {
  return api({
    method: "GET",
    path: "/v1/reminders",
    query: { scope },
    schema: remindersResponseSchema,
  }) as Promise<{ items: Reminder[] }>;
}
