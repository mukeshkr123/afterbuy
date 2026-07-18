import {
  integer,
  sqliteTable,
  text,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  reminderLeadDays: integer("reminder_lead_days").notNull().default(7),
  pushEnabled: integer("push_enabled").notNull().default(1),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

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

export const PURCHASE_DELIVERY_STATUSES = [
  "ordered",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const purchases = sqliteTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    merchant: text("merchant"),
    category: text("category", { enum: PURCHASE_CATEGORIES })
      .notNull()
      .default("other"),
    purchaseDate: text("purchase_date").notNull(),
    amountMinor: integer("amount_minor"),
    currency: text("currency").notNull().default("USD"),
    orderNumber: text("order_number"),
    notes: text("notes"),
    deliveryStatus: text("delivery_status", {
      enum: PURCHASE_DELIVERY_STATUSES,
    })
      .notNull()
      .default("ordered"),
    trackingNumber: text("tracking_number"),
    carrier: text("carrier"),
    warrantyExpiresAt: text("warranty_expires_at"),
    returnDeadlineAt: text("return_deadline_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => ({
    userCreatedIdx: index("purchases_user_id_created_at_idx").on(
      table.userId,
      table.createdAt
    ),
    userDeliveryIdx: index("purchases_user_id_delivery_status_idx").on(
      table.userId,
      table.deliveryStatus
    ),
    userCategoryIdx: index("purchases_user_id_category_idx").on(
      table.userId,
      table.category
    ),
  })
);

export type PurchaseRow = typeof purchases.$inferSelect;
export type NewPurchaseRow = typeof purchases.$inferInsert;

export const receipts = sqliteTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    purchaseIdx: index("receipts_purchase_id_idx").on(table.purchaseId),
    userIdx: index("receipts_user_id_idx").on(table.userId),
  })
);

export type ReceiptRow = typeof receipts.$inferSelect;
export type NewReceiptRow = typeof receipts.$inferInsert;

export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id),
    type: text("type").notNull(),
    status: text("status").notNull(),
    openedAt: text("opened_at").notNull(),
    resolvedAt: text("resolved_at"),
    refundAmountMinor: integer("refund_amount_minor"),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("claims_user_id_idx").on(table.userId),
    purchaseIdx: index("claims_purchase_id_idx").on(table.purchaseId),
  })
);

export type ClaimRow = typeof claims.$inferSelect;
export type NewClaimRow = typeof claims.$inferInsert;

export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id),
    kind: text("kind").notNull(),
    fireOn: text("fire_on").notNull(), // YYYY-MM-DD
    sentAt: text("sent_at"),
    dismissedAt: text("dismissed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    purchaseKindUnique: unique("reminders_purchase_id_kind_unique").on(
      table.purchaseId,
      table.kind
    ),
    fireOnSentIdx: index("reminders_fire_on_sent_at_idx").on(
      table.fireOn,
      table.sentAt
    ),
    userIdx: index("reminders_user_id_idx").on(table.userId),
  })
);

export type ReminderRow = typeof reminders.$inferSelect;
export type NewReminderRow = typeof reminders.$inferInsert;

export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expoPushToken: text("expo_push_token").notNull().unique(),
    platform: text("platform").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdx: index("devices_user_id_idx").on(table.userId),
  })
);

export type DeviceRow = typeof devices.$inferSelect;
export type NewDeviceRow = typeof devices.$inferInsert;
