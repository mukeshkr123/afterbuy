# AfterBuy — Task Breakdown

Phased tasks and end-to-end verification. Sequenced as a single dependency chain
for a solo developer; each phase ends in something demoable.

Companion documents: [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md) ·
[DATA_MODEL.md](./DATA_MODEL.md) · [API_CONTRACTS.md](./API_CONTRACTS.md)

---

## Phase 0 — Unbreak the repo

The repository does not currently build. Nothing else starts until it does.

- **0.1** Delete `infra/web.ts`.
- **0.2** Remove `import("./infra/web")`, the `createWeb(...)` call, and the
  `webUrl` output from `sst.config.ts`.
- **0.3** Remove the `dev:web` script from `package.json`; remove
  `WEB_SMOKE_URL` from `.env.example`.
- **0.4** Remove orphaned React devDeps from root `package.json`
  (`@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `happy-dom`);
  refresh the lockfile.
- **0.5** Run `pnpm verify:template` and fix whatever it flags.

✅ **Done when:** `pnpm ci` is green and `sst deploy` succeeds.

---

## Phase 1 — Auth spine

- **1.1** `users` table + migration + `CHECK` constraints.
- **1.2** `authMiddleware`: `jose` JWKS verification, KV-cached key set (TTL 1h)
  and user lookup (TTL 5m).
- **1.3** Error envelope + `apiError()` helper; retrofit the existing routes.
- **1.4** `GET /v1/me`, `PATCH /v1/me` with JIT provisioning.
- **1.5** `POST /v1/webhooks/clerk` with Svix signature verification.
- **1.6** Retire `REQUIRED_RUNTIME_TOKEN`; add Clerk secrets and vars to
  `infra/api.ts`.
- **1.7** Set CI values on the **`production` GitHub Environment** — repo-level
  is a silent no-op (ADR-0005).
- **1.8** Tests: valid JWT, expired JWT, wrong issuer, missing header, JIT
  provisioning on first call.

✅ **Done when:** curl with a real Clerk JWT returns a provisioned user.

---

## Phase 2 — Domain core

- **2.1** `purchases` schema + indexes + migration; drop `example_jobs`.
- **2.2** Zod schemas in `@acme/shared`: create, update, response, list-query.
- **2.3** Keyset pagination helper — reusable; claims and reminders need it too.
- **2.4** Idempotency middleware (KV, 24h TTL).
- **2.5** Purchases CRUD + soft delete + restore.
- **2.6** Search/filter query builder over the list endpoint.
- **2.7** `GET /v1/meta/categories` with default warranty and return windows.
- **2.8** Extend rate limiting to all `/v1`, keyed on user id.
- **2.9** Tests, including cross-user access denial (expect `404`, not `403`).

✅ **Done when:** a full purchase lifecycle runs over HTTP and
`pnpm api:openapi` regenerates cleanly.

---

## Phase 3 — Receipts

- **3.1** `receipts` schema + migration.
- **3.2** Multipart upload streamed to R2; validate content-type and size cap.
- **3.3** `GET /v1/receipts/:id` → signed short-TTL redirect.
- **3.4** Delete row + R2 object; embed `receipts[]` in purchase detail.
- **3.5** `receipts.purge` queue handler for account deletion.

✅ **Done when:** a photo uploads and fetches back.

---

## Phase 4 — Claims, reminders, push

- **4.1** `claims` schema + CRUD + status transition validation.
- **4.2** `reminders` schema + unique `(purchase_id, kind)` + index
  `(fire_on, sent_at)`.
- **4.3** `regenerateReminders(purchaseId)`; call from purchase create/update
  and from a `reminderLeadDays` change.
- **4.4** `devices` schema; `POST /v1/devices`, `DELETE /v1/devices/:id`.
- **4.5** Rename the queue → `ReminderQueue` / `ReminderDlq` in `infra/queue.ts`
  and `infra/api.ts`. Do it now, while traffic is demo-only.
- **4.6** Cron scan → enqueue; timezone-aware rolling window.
- **4.7** Consumer: Expo Push batching (≤100 tokens/request), `sent_at` stamping
  **after** Expo accepts, receipt checking, `DeviceNotRegistered` cleanup.
- **4.8** `GET /v1/reminders`, `POST /v1/reminders/:id/dismiss`.
- **4.9** Tests: derivation idempotency, past dates, lead-day changes, batch
  send.

✅ **Done when:** a real push notification lands on a real phone.

---

## Phase 5 — App shell

- **5.1** Create `apps/mobile` (Expo managed); wire into the pnpm workspace.
- **5.2** Metro + pnpm config (`node-linker=hoisted` or `watchFolders` +
  `disableHierarchicalLookup`). **Verify `@acme/shared` imports resolve before
  continuing** — this blocks everything downstream.
- **5.3** Design tokens: color (light + dark), type scale, spacing, radius,
  elevation.
- **5.4** Primitives: Button, Input, Card, Badge, Tabs, Sheet, Dialog, ListItem,
  StatusPill, EmptyState, Skeleton, Toast.
- **5.5** `ClerkProvider` + `expo-secure-store` token cache; auth route group.
- **5.6** Sign-in / sign-up / verify screens; protected route redirects.
- **5.7** Bottom tabs: Home, Purchases, Reminders, Profile.
- **5.8** Typed API client generated from `@acme/shared` schemas; auth
  interceptor.

✅ **Done when:** you can sign in on a device and see empty tabs.

---

## Phase 6 — Core flows

- **6.1** Purchases list: infinite scroll, skeletons, empty state.
- **6.2** Purchase detail: receipts, claims, deadline countdowns.
- **6.3** Create/edit form: `react-hook-form` + zod, **category-default date
  prefill**, inline validation errors.
- **6.4** Receipt capture: `expo-image-picker`, upload progress, retry.
- **6.5** Search screen: debounced server query, filters, recent searches.
- **6.6** Delivery status control on the detail screen.
- **6.7** Home: upcoming deadlines, recent purchases, quick add.
- **6.8** Delete with undo toast, wired to `POST /v1/purchases/:id/restore`.

✅ **Done when:** the full flow works on a device against the deployed API.

---

## Phase 7 — Claims, reminders, settings

- **7.1** Claims list + detail + create/edit.
- **7.2** Reminders screen (upcoming) + Notifications screen (history via
  `scope=history`).
- **7.3** `expo-notifications`: permission priming screen, token registration,
  foreground handling.
- **7.4** Deep link: push tap → purchase detail.
- **7.5** Settings: reminder lead days, push toggle, timezone, dark mode.
- **7.6** Profile, support/help, legal, sign-out (unregisters the device).
- **7.7** Account deletion flow. **Mandatory** — Apple requires in-app account
  deletion and will reject without it.

✅ **Done when:** tapping a push notification opens the right purchase.

---

## Phase 8 — Offline and polish

- **8.1** Query persister + hydration; stale-data affordance
  ("Updated 2h ago").
- **8.2** NetInfo → `onlineManager`; offline banner.
- **8.3** Mutation outbox: persistence, FIFO replay, `Idempotency-Key`
  generation.
- **8.4** Optimistic updates + rollback across purchase and claim mutations.
- **8.5** Pending-upload handling for receipts captured offline.
- **8.6** Error / empty / loading / success states audited against the PRD list.
- **8.7** Accessibility: labels, 44pt touch targets, contrast, dynamic type,
  screen reader pass.
- **8.8** Dark mode verification across every screen.
- **8.9** Micro-interactions and transitions (`react-native-reanimated`),
  restrained.

✅ **Done when:** an airplane-mode add replays cleanly on reconnect with no
duplicate.

---

## Phase 9 — Release

- **9.1** EAS Build profiles (dev / preview / prod); EAS Update channels.
- **9.2** App icons, splash, store listing copy and screenshots.
- **9.3** Privacy manifests, App Store data-collection disclosure, permission
  strings.
- **9.4** TestFlight + Play Internal Testing builds.
- **9.5** Update `README.md` and `docs/`; write **ADR-0007 "Clerk as identity
  provider"** and **ADR-0008 "Mobile client architecture"** — `CLAUDE.md`
  requires ADRs when the operating model changes, not just when code does.

---

## Verification

### Per phase

```sh
pnpm ci                 # build, typecheck, lint, test, verify:*, openapi
pnpm verify:template    # infra / package / docs drift
pnpm verify:migrations  # drizzle journal integrity
```

### API end-to-end (after Phase 4)

Against a deployed preview stage:

1. Sign in as a Clerk test user; capture the session JWT.
2. `POST /v1/purchases` with `returnDeadlineAt` = today + 8 days.
3. `GET /v1/reminders?scope=upcoming` → one `return_deadline` reminder with
   `fire_on` = tomorrow.
4. `POST /v1/purchases/:id/receipts` with a JPEG → `GET /v1/receipts/:id`
   returns it.
5. Trigger the cron via a `wrangler` scheduled invocation → a push lands on a
   registered device.
6. Replay step 2 with the **same** `Idempotency-Key` → identical response and
   **no second row**.
7. A second user requests user one's purchase → `404` (not `403` — do not leak
   existence).

### Mobile (after Phase 8)

1. EAS dev build on a physical iOS device and a physical Android device.
2. Sign in → create a purchase with a receipt photo → verify it server-side.
3. Airplane mode → create one purchase, edit another → both show pending.
4. Restore connectivity → the outbox replays → server state matches with
   nothing duplicated.
5. Kill and relaunch while offline → the cached list still renders.
6. Receive a push → tap → land on the correct purchase detail.
7. VoiceOver / TalkBack pass over the primary flow; dark mode pass over every
   screen.
