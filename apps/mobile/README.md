# Acme Mobile

Expo managed app (iOS + Android + web). Phase 5 ships the app shell:
authentication flow, bottom-tab navigation, design tokens, and a typed API
client wired to the Phase 2 `/v1` surface.

## Dev workflow

```sh
# From repo root — make sure shared packages are built first.
pnpm install
pnpm --filter @acme/shared --filter @acme/db build

# Mobile workspace commands
pnpm mobile:dev          # starts Expo Metro bundler on :8081
pnpm mobile:ios          # boots iOS simulator
pnpm mobile:android      # boots Android emulator
pnpm mobile:web          # boots the web target
```

## Required env

Set in `apps/mobile/.env` (gitignored) or via EAS env profiles:

```sh
EXPO_PUBLIC_API_BASE_URL=http://localhost:8787
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

The API base URL defaults to `http://localhost:8787`, which matches
`wrangler dev` for the API. Phase 6+ swaps in per-stage URLs from
`eas.json`'s `env` blocks.

## Layout

```
app/                    # expo-router file-based routes
  _layout.tsx           # ClerkProvider + QueryClientProvider + ThemeProvider + Stack
  index.tsx             # signed-in → (tabs), signed-out → (auth)/sign-in
  (auth)/               # sign-in, sign-up, verify
  (tabs)/               # home, purchases, reminders, profile

src/
  api/                  # typed client + per-resource wrappers (Phase 2 Zod schemas)
  auth/                 # Clerk token cache + useAuth hook
  theme/                # tokens + ThemeProvider
  components/           # 11 design-system primitives
  hooks/                # useReducedMotion, useApiBaseUrl
  lib/                  # queryClient + AsyncStorage persister, uuid, storage
```

## Phase scope

Phase 5 lands the shell. The following Phase 6+ tasks fill in the bodies:

- **6.1** Purchases list infinite scroll ✅ Phase 6
- **6.2** Purchase detail with receipts/claims/deadlines ✅ Phase 6
- **6.3** Create/edit form with react-hook-form + Zod + category-default date prefill ✅ Phase 6
- **6.4** Receipt capture — stubbed in Phase 6 (button + screen, no `expo-image-picker` yet)
- **6.5** Search screen (debounced server query) ✅ Phase 6
- **6.6** Delivery status control ✅ Phase 6
- **6.7** Home (Upcoming + Recent + Quick add) ✅ Phase 6
- **6.8** Delete with undo toast ✅ Phase 6
- **7.1** Claims open + edit + status transitions ✅ Phase 7
- **7.2** Reminders screen (Upcoming + History tabs) ✅ Phase 7
- **7.3** `expo-notifications` registration + foreground handler ✅ Phase 7
- **7.4** Deep link: push tap → purchase detail ✅ Phase 7
- **7.5** Settings (lead days, push toggle, timezone, dark mode override) ✅ Phase 7
- **7.7** Account deletion flow ✅ Phase 7
- **8.x** Mutation outbox, offline replay
- **9.x** App icon, splash, EAS submit profiles, store assets

## Notes

- `node-linker=hoisted` is set in `apps/mobile/.npmrc` so Metro can resolve
  the workspace `@acme/shared` and `@acme/db` packages.
- The repo's strict TypeScript config (`exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`) applies; if a vendor type conflicts, narrow
  at the call site rather than relaxing the per-app config.
- Clerk's session JWT is fetched lazily inside the API client; the request
  includes `Authorization: Bearer <jwt>` automatically.
- Every write request gets an auto-generated `Idempotency-Key: <uuidv4>`
  header per `docs/API_CONTRACTS.md` §1.4.
