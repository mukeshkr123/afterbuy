// Query-key factory. Centralising the keys prevents the common "two screens
// invalidate slightly different keys" bug.
export const apiKeys = {
  me: () => ["me"] as const,
  categories: () => ["categories"] as const,
  purchases: {
    list: (q: {
      q?: string | undefined;
      category?: string | undefined;
      deliveryStatus?: string | undefined;
      from?: string | undefined;
      to?: string | undefined;
      sort?: string | undefined;
      limit?: number | undefined;
    }) => ["purchases", "list", q] as const,
    detail: (id: string) => ["purchases", "detail", id] as const,
  },
  reminders: (scope: "upcoming" | "history") => ["reminders", scope] as const,
  claims: {
    list: (q: { purchaseId?: string | undefined }) =>
      ["claims", "list", q] as const,
  },
} as const;
