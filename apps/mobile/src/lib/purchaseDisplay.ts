import type { Ionicons } from "@expo/vector-icons";
import type { PurchaseCategory, PurchaseDeliveryStatus } from "@acme/shared";
import type { StatusPillProps } from "@/components/StatusPill";
import { daysBetween, todayIso } from "./date";

type Glyph = keyof typeof Ionicons.glyphMap;

/**
 * Presentation for the four server delivery states. Screens previously wrote
 * `const deliveryStatus = "Delivered"` regardless of the real value.
 */
const DELIVERY: Record<
  PurchaseDeliveryStatus,
  { label: string; tone: NonNullable<StatusPillProps["tone"]> }
> = {
  ordered: { label: "Ordered", tone: "neutral" },
  shipped: { label: "Shipped", tone: "accent" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function deliveryDisplay(status: PurchaseDeliveryStatus) {
  return DELIVERY[status] ?? DELIVERY.ordered;
}

const CATEGORY_ICON: Record<PurchaseCategory, Glyph> = {
  electronics: "hardware-chip-outline",
  appliances: "restaurant-outline",
  furniture: "bed-outline",
  clothing: "shirt-outline",
  vehicle: "car-outline",
  home_improvement: "hammer-outline",
  services: "construct-outline",
  other: "cube-outline",
};

export function categoryIcon(category: PurchaseCategory): Glyph {
  return CATEGORY_ICON[category] ?? "cube-outline";
}

export function categoryLabel(category: PurchaseCategory): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Locale-aware date for display. Input is an ISO `YYYY-MM-DD`. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso + "T00:00:00Z");
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface DeadlineState {
  /** e.g. "Eligible till 20 May 2024" */
  label: string;
  /** e.g. "7 days left" / "Expired" */
  detail: string;
  expired: boolean;
  /** True inside the last week — worth drawing attention to. */
  urgent: boolean;
}

/**
 * Renders a return/warranty date as a live countdown. Replaces the hardcoded
 * "(7 days left)" that used to appear regardless of the actual date.
 */
export function deadlineState(
  iso: string | null | undefined,
  prefix: string
): DeadlineState | null {
  const formatted = formatDate(iso);
  if (!iso || !formatted) return null;
  const days = daysBetween(todayIso(), iso);
  const expired = days < 0;
  const detail = expired
    ? "Expired"
    : days === 0
      ? "Last day"
      : days === 1
        ? "1 day left"
        : `${days} days left`;
  return {
    label: `${prefix} ${formatted}`,
    detail,
    expired,
    urgent: !expired && days <= 7,
  };
}
