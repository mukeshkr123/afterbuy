import type { Href } from "expo-router";
import type { Reminder } from "@acme/shared";
import { deadlineState, formatDate } from "./purchaseDisplay";
import { daysBetween, todayIso } from "./date";

export const REMINDER_KIND = {
  warranty_expiry: {
    label: "Warranty",
    title: "Warranty ending",
    icon: "shield-checkmark-outline",
    tone: "success",
    prefix: "Expires",
  },
  return_deadline: {
    label: "Return",
    title: "Return window",
    icon: "sync-outline",
    tone: "accent",
    prefix: "Return by",
  },
} as const;

export function reminderDetailHref(
  reminder: Pick<Reminder, "id" | "purchaseId">
): Href {
  return {
    pathname: "/reminder/[id]",
    params: { id: reminder.id, purchaseId: reminder.purchaseId },
  };
}

export function reminderState(reminder: Reminder) {
  return deadlineState(reminder.fireOn, REMINDER_KIND[reminder.kind].prefix);
}

export function isReminderUpcoming(reminder: Reminder): boolean {
  return !reminder.sentAt && !reminder.dismissedAt;
}

export function reminderHistoryPresentation(reminder: Reminder): {
  label: "Closed" | "Expired";
  tone: "neutral" | "warning";
  detail: string;
} {
  if (reminder.dismissedAt) {
    const closedOn = new Date(reminder.dismissedAt).toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
    return {
      label: "Closed",
      tone: "neutral",
      detail: closedOn ? `Dismissed ${closedOn}` : "Dismissed",
    };
  }

  const fireOn = formatDate(reminder.fireOn);
  return {
    label: "Expired",
    tone: "warning",
    detail: fireOn ? `Passed ${fireOn}` : "Reminder date passed",
  };
}

export function reminderUpcomingSection(
  reminder: Reminder
): "Due Soon" | "Later" {
  const state = reminderState(reminder);
  return state?.urgent || state?.expired ? "Due Soon" : "Later";
}

export function reminderHistorySection(
  reminder: Reminder
): "Past 30 Days" | "Older" {
  const ageInDays = daysBetween(reminder.fireOn, todayIso());
  return ageInDays <= 30 ? "Past 30 Days" : "Older";
}
