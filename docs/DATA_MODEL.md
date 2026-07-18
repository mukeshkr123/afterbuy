# AfterBuy — Data Model

D1 / SQLite via Drizzle, extending `packages/db/src/schema.ts`.

Companion documents: [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md) ·
[API_CONTRACTS.md](./API_CONTRACTS.md) · [TASK_BREAKDOWN.md](./TASK_BREAKDOWN.md)

---

## 1. Conventions

Follow the existing `example_jobs` table:

- **`text` primary keys** — UUIDv7, generated server-side.
- **ISO-8601 `text` timestamps**, not integers. Dates that are calendar dates
  (`purchase_date`, `fire_on`) are `YYYY-MM-DD`; instants are full ISO-8601 UTC.
- snake_case columns.
- Soft delete via nullable `deleted_at` where undo or audit matters.

**Money is `integer` minor units plus an ISO-4217 `currency` column. Never a
float.** `1999` + `USD` is $19.99.

Enums are enforced **twice**: in the Drizzle schema _and_ as SQL `CHECK`
constraints. The existing `example_jobs.status` enum lives only in TypeScript,
so the database will happily accept garbage — a real hole worth not repeating.

---

## 2. Tables

### 2.1 `users`

| column               | type    | notes                                                     |
| -------------------- | ------- | --------------------------------------------------------- |
| `id`                 | text PK | UUIDv7                                                    |
| `clerk_user_id`      | text    | **unique, not null**                                      |
| `email`              | text    | denormalized from Clerk for display/support               |
| `reminder_lead_days` | integer | default `7`                                               |
| `push_enabled`       | integer | boolean, default `1`                                      |
| `timezone`           | text    | IANA, default `UTC` — the cron must fire in local morning |
| `created_at`         | text    | not null                                                  |
| `updated_at`         | text    | not null                                                  |
| `deleted_at`         | text    | nullable                                                  |

Clerk owns identity; this table owns everything Clerk cannot answer cheaply —
FK targets, notification preferences, and an enumerable user list for the
nightly cron. `clerk_user_id` is the only coupling point.

### 2.2 `purchases`

| column                      | type                 | notes                                          |
| --------------------------- | -------------------- | ---------------------------------------------- |
| `id`                        | text PK              |                                                |
| `user_id`                   | text FK → `users.id` | **not null, indexed**                          |
| `title`                     | text                 | not null                                       |
| `merchant`                  | text                 | nullable                                       |
| `category`                  | text                 | enum, default `other`                          |
| `purchase_date`             | text                 | ISO date, not null                             |
| `amount_minor`              | integer              | nullable                                       |
| `currency`                  | text                 | default `USD`                                  |
| `order_number`              | text                 | nullable                                       |
| `notes`                     | text                 | nullable                                       |
| `delivery_status`           | text                 | enum, default `ordered`                        |
| `tracking_number`           | text                 | nullable — display + deep link out only        |
| `carrier`                   | text                 | nullable, free text; no aggregator integration |
| `warranty_expires_at`       | text                 | nullable, ISO date                             |
| `return_deadline_at`        | text                 | nullable, ISO date                             |
| `created_at` / `updated_at` | text                 | not null                                       |
| `deleted_at`                | text                 | nullable                                       |

**Indexes**

| index                        | serves                |
| ---------------------------- | --------------------- |
| `(user_id, created_at DESC)` | the keyset list query |
| `(user_id, delivery_status)` | delivery filter       |
| `(user_id, category)`        | category filter       |

**Enums**

```
category:        electronics | appliances | furniture | clothing
                 | vehicle | home_improvement | services | other
delivery_status: ordered | shipped | delivered | cancelled
```

### 2.3 `receipts`

| column             | type    | notes                                        |
| ------------------ | ------- | -------------------------------------------- |
| `id`               | text PK |                                              |
| `purchase_id`      | text FK | indexed                                      |
| `user_id`          | text FK | denormalized so a delete sweep needs no join |
| `r2_key`           | text    | not null                                     |
| `content_type`     | text    | not null                                     |
| `size_bytes`       | integer | not null                                     |
| `width` / `height` | integer | nullable                                     |
| `created_at`       | text    | not null                                     |

`r2_key` format:

```
receipts/{user_id}/{purchase_id}/{receipt_id}.{ext}
```

User-prefixed so an account deletion purge is a single R2 prefix listing.

### 2.4 `claims`

One table for returns, refunds, and warranty claims, discriminated by `type`.

| column                      | type    | notes                                         |
| --------------------------- | ------- | --------------------------------------------- |
| `id`                        | text PK |                                               |
| `user_id`                   | text FK | indexed                                       |
| `purchase_id`               | text FK | indexed                                       |
| `type`                      | text    | enum `return \| refund \| warranty`, not null |
| `status`                    | text    | enum, not null                                |
| `opened_at`                 | text    | not null                                      |
| `resolved_at`               | text    | nullable                                      |
| `refund_amount_minor`       | integer | nullable                                      |
| `reference`                 | text    | nullable — merchant RMA / case number         |
| `notes`                     | text    | nullable                                      |
| `created_at` / `updated_at` | text    | not null                                      |

```
status: draft | submitted | in_progress | approved
        | rejected | completed | cancelled
```

**Why one table, not three:** the three flows share ~90% of their fields and
every screen. Three tables would triple the query surface for a status enum's
worth of actual difference.

The app **records** claims. It never files anything with a merchant — no MVP
could.

### 2.5 `reminders`

Derived rows. Regenerated whenever a purchase's deadline dates change.

| column         | type    | notes                                       |
| -------------- | ------- | ------------------------------------------- |
| `id`           | text PK |                                             |
| `user_id`      | text FK |                                             |
| `purchase_id`  | text FK |                                             |
| `kind`         | text    | enum `warranty_expiry \| return_deadline`   |
| `fire_on`      | text    | **ISO date, indexed** — the cron's scan key |
| `sent_at`      | text    | nullable; null ⇒ eligible                   |
| `dismissed_at` | text    | nullable                                    |
| `created_at`   | text    | not null                                    |

**Constraints**

- Index `(fire_on, sent_at)` — the single hot query in the whole system.
- Unique `(purchase_id, kind)` — so regeneration upserts instead of duplicating.

### 2.6 `devices`

| column            | type    | notes                 |
| ----------------- | ------- | --------------------- |
| `id`              | text PK |                       |
| `user_id`         | text FK | indexed               |
| `expo_push_token` | text    | **unique**            |
| `platform`        | text    | enum `ios \| android` |
| `last_seen_at`    | text    | not null              |
| `created_at`      | text    | not null              |

A token reported invalid by Expo (`DeviceNotRegistered`) deletes the row.

### 2.7 Dropped

`example_jobs` — removed in a Phase 2 migration once the demo route goes.

### 2.8 Deliberately absent: `notifications`

The in-app notifications screen reads:

```sql
SELECT * FROM reminders
WHERE user_id = ? AND sent_at IS NOT NULL
ORDER BY sent_at DESC
```

That is a real delivery history with no second write path to keep in sync. A
separate `notifications` table would duplicate state that `reminders` already
holds correctly.

---

## 3. Reminder generation

On any purchase create/update where `warranty_expires_at` or
`return_deadline_at` changed:

```
for kind in (warranty_expiry, return_deadline):
    date = the corresponding purchase column
    if date is null            → delete reminder (purchase_id, kind)
    else                       → upsert reminder with
                                 fire_on = date − users.reminder_lead_days
    if fire_on is in the past  → do not resurrect; leave sent_at set
```

Reminders are **derived state, never hand-edited**. Any date change simply
re-derives them. This is why regeneration is idempotent and why the unique
constraint on `(purchase_id, kind)` matters — without it, an edit loop grows
duplicate reminders and the user gets the same warning three times.

`reminder_lead_days` is per-user, so changing the preference must re-derive
`fire_on` across all of that user's un-sent reminders.

---

## 4. Migrations

- Additive Drizzle migrations in `packages/db/drizzle/`, one per phase.
- **Never edited after being applied.** `pnpm verify:migrations` guards the
  journal.
- Every enum ships with a matching SQL `CHECK` constraint.
- Restores follow **ADR-0004**: schema first, then original INSERTs in FK order,
  transaction control stripped. FK order for AfterBuy:

  ```
  users → purchases → receipts → claims → reminders → devices
  ```
