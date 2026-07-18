import { reminderSchema, type Reminder } from "@acme/shared";
import { z } from "zod";
import type { ApiRequest } from "./client";

const listResponse = z.object({ items: z.array(reminderSchema) });

export type { Reminder };

export async function getReminders(
  api: ApiRequest,
  scope: "upcoming" | "history"
): Promise<{ items: Reminder[] }> {
  return api({
    method: "GET",
    path: "/v1/reminders",
    query: { scope },
    schema: listResponse,
  }) as Promise<{ items: Reminder[] }>;
}

export function dismissReminder(api: ApiRequest, id: string): Promise<void> {
  return api({
    method: "POST",
    path: `/v1/reminders/${encodeURIComponent(id)}/dismiss`,
    schema: z.void(),
  }) as Promise<void>;
}
