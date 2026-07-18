export const PURCHASE_CATEGORIES = [
  "electronics",
  "appliances",
  "furniture",
  "clothing",
  "vehicle",
  "home_improvement",
  "services",
  "other",
] as const;

export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

export const PURCHASE_DELIVERY_STATUSES = [
  "ordered",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type PurchaseDeliveryStatus =
  (typeof PURCHASE_DELIVERY_STATUSES)[number];

// Server-of-record defaults for warranty + return windows per category. The
// API serves these via GET /v1/meta/categories so they can be corrected
// without shipping a new mobile release.
export const CATEGORY_DEFAULT_WINDOWS: Readonly<
  Record<
    PurchaseCategory,
    { defaultReturnDays: number; defaultWarrantyDays: number }
  >
> = {
  electronics: { defaultReturnDays: 30, defaultWarrantyDays: 365 },
  appliances: { defaultReturnDays: 30, defaultWarrantyDays: 365 },
  furniture: { defaultReturnDays: 30, defaultWarrantyDays: 365 },
  clothing: { defaultReturnDays: 30, defaultWarrantyDays: 0 },
  vehicle: { defaultReturnDays: 30, defaultWarrantyDays: 365 },
  home_improvement: { defaultReturnDays: 90, defaultWarrantyDays: 365 },
  services: { defaultReturnDays: 14, defaultWarrantyDays: 0 },
  other: { defaultReturnDays: 30, defaultWarrantyDays: 0 },
};

export const PURCHASE_SORT_KEYS = [
  "purchaseDate",
  "createdAt",
  "amount",
] as const;

export type PurchaseSortKey = (typeof PURCHASE_SORT_KEYS)[number];
