# AfterBuy — Technical Plan

Companion documents: [DATA_MODEL.md](./DATA_MODEL.md) ·
[API_CONTRACTS.md](./API_CONTRACTS.md) · [TASK_BREAKDOWN.md](./TASK_BREAKDOWN.md)

---

## 1. Context

### 1.1 Why this exists

`docs/PRD.md` is not a PRD. It is a **design brief for a clickable prototype** —
it names screens and visual qualities but defines no entities, no rules, and no
contracts. Meanwhile this repository is still the untouched generic
`acme-cloudflare-stack` template from commit `48aec09`: one demo table
(`example_jobs`), two demo routes (`GET /health`, `POST /jobs/example`), and
**no authentication of any kind**. Nothing named in the PRD — purchase,
warranty, return, reminder — exists anywhere in code.

So the gap is not "add a mobile app." It is: define the AfterBuy domain, build
the backend that has never been built, and add a React Native client — on a
Cloudflare stack whose ADRs constrain how infrastructure may be created.

### 1.2 The repo does not currently build

Commit `631621e` deleted `apps/web` but left every reference to it:

| Dangling reference                                                      | File                                  |
| ----------------------------------------------------------------------- | ------------------------------------- |
| `handler: "apps/web/src/worker.ts"`                                     | `infra/web.ts` (entire file orphaned) |
| `await import("./infra/web")`, `createWeb({...})`, `webUrl` output      | `sst.config.ts`                       |
| `"dev:web": "pnpm --filter @acme/web dev"`                              | `package.json`                        |
| `WEB_SMOKE_URL`                                                         | `.env.example`                        |
| `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `happy-dom` | root `package.json` devDeps           |

`sst deploy` and `pnpm ci` fail until this is cleared. It is **Phase 0**.

### 1.3 Intended outcome

A shippable AfterBuy MVP: an Expo app over a Hono/D1/R2 Worker API, where a user
manually records purchases, attaches receipt photos, and gets pushed a reminder
before a warranty or return window closes. That last clause is the product — the
rest is scaffolding around it.

### 1.4 Settled decisions

| #   | Decision                 | Choice                                                                    |
| --- | ------------------------ | ------------------------------------------------------------------------- |
| 1   | Purchase ingestion       | **Manual entry + receipt photo.** No email parsing, no retailer scraping. |
| 2   | RN flavor                | **Expo managed + EAS** (expo-router, EAS Build/Update).                   |
| 3   | Auth                     | **Clerk** (`@clerk/clerk-expo`; Worker verifies JWT via JWKS).            |
| 4   | Receipt handling         | **Store only, no OCR.** Photo is claim evidence.                          |
| 5   | Deadline dates           | **User-entered, category-default prefilled.**                             |
| 6   | Reminder scheduling      | **Daily cron scan of D1** → queue → push. No Durable Objects.             |
| 7   | Offline                  | **Cached reads + queued writes** (TanStack Query persistence).            |
| 8   | Delivery tracking        | **Manual status, user-updated.** No carrier aggregator.                   |
| 9   | Returns/refunds/warranty | **Track only, deadline-driven.** App never files a claim.                 |
| 10  | Push                     | **Expo Push Service.**                                                    |
| 11  | Search                   | **Server-side D1, LIKE + indexed filters.**                               |
| 12  | Broken repo              | **Phase 0 cleanup**, before any AfterBuy work.                            |
| 13  | Team                     | **Solo + AI, ship-fast.** Vertical slices, each phase demoable.           |

### 1.5 Out of MVP scope

Receipt OCR · email/SMS ingestion · retailer account linking · live carrier
tracking · spend analytics · sharing/multi-user households · web app · price-drop
monitoring · merchant policy database.

---

## 2. Architecture

### 2.1 System shape

```
┌─────────────────────────────┐
│  Expo app (iOS + Android)   │
│  expo-router · TanStack     │
│  Query (persisted) · Clerk  │
└──────────┬──────────────────┘
           │ HTTPS, Bearer <Clerk session JWT>
           ▼
┌─────────────────────────────────────────────────┐
│  ApiWorker  (Hono + @hono/zod-openapi)          │
│  requestId → logger → CORS → auth → rateLimit   │
└───┬─────────┬──────────┬──────────┬─────────────┘
    │         │          │          │
    ▼         ▼          ▼          ▼
   D1        R2         KV      ReminderQueue
 (domain) (receipts) (ratelimit  (batch → Expo
                     idempotency) Push Service)
                                       ▲
                          cron 0 2 * * * scans D1
```

Everything is a **binding** on the single existing `ApiWorker`. No new Worker,
no Durable Objects, no external services except Clerk and Expo Push.

### 2.2 Why this shape

- **One Worker.** Two routes today, ~20 at MVP. Splitting services at this size
  buys nothing and costs a deploy graph.
- **Cron scan over DO alarms.** A daily keyset scan of `reminders WHERE
fire_on <= ? AND sent_at IS NULL` is one code path, trivially replayable, and
  correct well past MVP scale. A Durable Object per purchase would be new
  infrastructure in a repo that has none, for sub-day precision nobody needs on
  a "your warranty expires in 7 days" notification.
- **Clerk, but thin.** The Worker does **not** take a Clerk server SDK
  dependency. It verifies the session JWT against Clerk's JWKS with `jose`,
  caching the key set in KV. Clerk stays an identity provider; it never becomes
  a runtime dependency of a request path.

### 2.3 Auth flow

```
Expo app ──(Clerk hosted UI / native OAuth)──▶ Clerk
   │  session JWT (short-lived), stored via expo-secure-store token cache
   ▼
Worker authMiddleware:
   1. read Authorization: Bearer <jwt>
   2. fetch JWKS from CLERK_JWKS_URL, cache in KV (TTL 1h)
   3. jose.jwtVerify → { sub: clerk_user_id, iss, exp, azp }
   4. verify iss === CLERK_ISSUER and azp ∈ allowed
   5. look up users WHERE clerk_user_id = sub  (KV-cached, TTL 5m)
      └─ miss → JIT-provision a users row
   6. c.set("user", { id, clerkUserId })
```

**Why a local `users` table at all**, given Clerk holds identity: every domain
row needs a stable internal FK, push tokens and reminder preferences must live
somewhere queryable, and the nightly cron must enumerate users without calling
Clerk. `users.clerk_user_id` is the only coupling point.

A **Clerk webhook** (`user.deleted`) hits `POST /v1/webhooks/clerk`, verified via
Svix signature using the existing `OPTIONAL_WEBHOOK_SECRET` secret slot — that
placeholder secret finally gets a real job. On delete: soft-delete the user,
enqueue R2 receipt purge.

### 2.4 New secrets and vars

| Name                   | Kind         | Purpose                                       |
| ---------------------- | ------------ | --------------------------------------------- |
| `CLERK_ISSUER`         | var          | e.g. `https://x.clerk.accounts.dev`           |
| `CLERK_JWKS_URL`       | var          | derived from issuer; explicit for testability |
| `CLERK_WEBHOOK_SECRET` | `sst.Secret` | Svix signature verification                   |
| `EXPO_ACCESS_TOKEN`    | `sst.Secret` | Expo Push (enables receipt checking)          |

Per **ADR-0005**, all CI values go on the `production` GitHub Environment:

```sh
gh secret set CLERK_WEBHOOK_SECRET --env production
gh variable set CLERK_ISSUER --env production
```

Repo-level is a silent no-op for the deploy job.

`REQUIRED_RUNTIME_TOKEN` is currently only a presence check and becomes dead
weight — retire it in Phase 1 rather than leaving a secret that authenticates
nothing.

### 2.5 Infrastructure deltas (`infra/`)

Per **ADR-0001/0002**, SST creates everything and names it
`${$app.name}-${$app.stage}-${base}`. No IDs committed anywhere.

| File               | Change                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `infra/web.ts`     | **delete** (orphaned)                                              |
| `infra/queue.ts`   | rename `ExampleQueue`/`ExampleDlq` → `ReminderQueue`/`ReminderDlq` |
| `infra/api.ts`     | link new secrets; retarget queue consumer; keep cron `0 2 * * *`   |
| `infra/storage.ts` | unchanged — D1, R2, KV already exist and are correctly named       |
| `sst.config.ts`    | drop `createWeb`, drop `webUrl` output                             |

Renaming the queue destroys and recreates it — acceptable now (it holds only
demo traffic), and per **ADR-0003** it is the correct move rather than an
`ignoreChanges` band-aid.

`apps/api/wrangler.jsonc` `compatibility_date` must stay equal to
`infra/env.ts` `COMPATIBILITY_DATE` (`2026-07-18`) — enforced by
`pnpm verify:template`.

### 2.6 Mobile architecture

```
apps/mobile/
  app/                        # expo-router, file-based
    (auth)/sign-in.tsx  (auth)/sign-up.tsx  (auth)/verify.tsx
    (tabs)/index.tsx          # Home
    (tabs)/purchases.tsx  (tabs)/reminders.tsx  (tabs)/profile.tsx
    purchase/[id].tsx  purchase/new.tsx  purchase/[id]/edit.tsx
    claim/[id].tsx  claim/new.tsx
    settings/*  onboarding/*  search.tsx
    _layout.tsx               # ClerkProvider + QueryClientProvider + theme
  src/
    api/                      # typed client, generated from @acme/shared zod
    components/               # design system primitives
    theme/                    # tokens: color, space, radius, type
    hooks/  offline/  lib/
```

| Concern        | Choice                                    | Why                                                                                                                                                                                  |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Routing        | `expo-router`                             | File-based, deep links and typed routes free                                                                                                                                         |
| Server state   | TanStack Query v5                         | Persistence + offline mutations are first-class                                                                                                                                      |
| Persistence    | `@tanstack/query-async-storage-persister` | Cached reads survive cold start                                                                                                                                                      |
| Local UI state | Zustand, sparingly                        | Most state is server state; avoid a second store                                                                                                                                     |
| Styling        | Token module + RN `StyleSheet`            | The PRD wants a small explicit design system; a token file _is_ that system. NativeWind is a fine substitute if you prefer the Tailwind idiom — **decide before Phase 5, not after** |
| Forms          | `react-hook-form` + zod resolver          | Same zod schemas the API validates with                                                                                                                                              |
| Secure storage | `expo-secure-store`                       | Clerk token cache                                                                                                                                                                    |
| Media          | `expo-image-picker`, `expo-image`         | Receipt capture + fast cached rendering                                                                                                                                              |
| Push           | `expo-notifications`                      | Token registration + foreground handling                                                                                                                                             |
| Connectivity   | `@react-native-community/netinfo`         | Drives Query's `onlineManager`                                                                                                                                                       |

**Monorepo gotchas** — these bite on day one:

- pnpm's symlinked `node_modules` breaks Metro. Set `node-linker=hoisted` in
  `.npmrc` **scoped to `apps/mobile`**, or configure Metro with `watchFolders`
  pointing at the workspace root plus `disableHierarchicalLookup: true`.
- `@acme/shared` must ship a RN-consumable build (no `node:` imports in the
  schema path). It is pure zod today, so this holds — keep it that way.

### 2.7 Offline model

```
Read:   Query cache → AsyncStorage persister → hydrate on launch
        Stale data renders immediately with an "Updated 2h ago" affordance
Write:  optimistic cache update
        → mutation persisted to the outbox
        → NetInfo reports online → replay in FIFO order
        → each carries Idempotency-Key: <client-generated UUID>
```

**Idempotency is the load-bearing piece.** A replayed queued write must not
create a duplicate purchase. Every non-GET route accepts `Idempotency-Key`; the
Worker stores `idem:<user_id>:<key>` → serialized response in KV with a 24h TTL
and returns the stored response on repeat. Without this, offline writes silently
duplicate on flaky networks — which is exactly when they replay.

Receipt uploads are **not** queued offline (binary payloads in an outbox is a
different, larger problem). Offline capture saves the local URI on the purchase
and uploads on reconnect, showing a pending badge.

---

## 3. Development plan

Vertical slices; each phase ends in something demoable on a device.

| Phase                               | Outcome                                                   | Demo                                            |
| ----------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| **0 · Unbreak**                     | Repo builds and deploys again                             | `pnpm ci` green, `sst deploy` succeeds          |
| **1 · Auth spine**                  | Clerk verification + `users` + `/v1/me`                   | curl with a real JWT returns a provisioned user |
| **2 · Domain core**                 | purchases schema, CRUD, list/search                       | full purchase lifecycle via HTTP                |
| **3 · Receipts**                    | R2 upload/serve/delete                                    | upload a photo, fetch it back                   |
| **4 · Claims + reminders**          | claims CRUD, reminder derivation, cron, push              | a real push lands on a real phone               |
| **5 · App shell**                   | Expo scaffold, design system, navigation, Clerk UI        | sign in on device, empty tabs                   |
| **6 · App core flows**              | purchase list/detail/create/edit, search, receipt capture | end-to-end on device against prod API           |
| **7 · Claims, reminders, settings** | remaining screens, notification handling, deep links      | tapping a push opens the purchase               |
| **8 · Offline + polish**            | persistence, outbox, skeletons, undo, a11y, dark mode     | airplane-mode add, replays on reconnect         |
| **9 · Release**                     | EAS profiles, store assets, privacy, TestFlight/Internal  | installable build                               |

**Sequencing rationale:** the backend leads by four phases so the app is never
built against a mock. Push (Phase 4) lands before any app screen that isn't the
shell, because push is the riskiest integration — certificates, tokens,
permissions — and finding that out in Phase 8 would be expensive. Offline is
last because it is a cross-cutting behavior over flows that must exist first.

**Testing:** `@cloudflare/vitest-pool-workers` for API and queue (patterns exist
in `apps/api/test/`); each new route ships with its test in the same task.
Mobile gets component tests only where logic is non-trivial — the design system
and the offline outbox — not blanket screen coverage.

---

## 4. Open risks

| Risk                            | Impact                                             | Mitigation                                                                                         |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| pnpm + Metro resolution         | Blocks Phase 5 entirely                            | Prove `@acme/shared` imports in task 5.2 **before** building anything on top                       |
| Manual entry friction           | Users add 2 purchases and stop — kills the product | Fastest-possible add flow; measure completion rate in Phase 9 and treat OCR as the top fast-follow |
| Timezone correctness on cron    | Reminders fire at 2am local, or a day late         | Store IANA tz per user; cron scans a rolling window rather than an exact day                       |
| Clerk JWKS unavailable          | Total auth outage                                  | KV-cache with generous TTL; serve stale keys on fetch failure                                      |
| Queue rename destroys the queue | Acceptable now, not later                          | Do it in Phase 4 while traffic is demo-only (ADR-0003: fix state at the source)                    |
| Store review: account deletion  | Rejection                                          | Task 7.7 is mandatory, not optional — Apple requires in-app deletion                               |

---

## 5. Documentation obligations

`CLAUDE.md` requires `docs/adr/` updates when the operating model changes, not
just the code. Two new ADRs are due in Phase 9:

- **ADR-0007 — Clerk as identity provider.** Why an external IdP on an
  otherwise Cloudflare-owned stack, and why the Worker verifies JWTs directly
  rather than taking an SDK dependency.
- **ADR-0008 — Mobile client architecture.** Expo managed + EAS, and the
  offline write model.
