# Phase 7 — Claims, Reminders, Settings, Push, Account Deletion

Phase 7 wires claims open/edit, reminders tab, settings, push notifications,
and the mandatory account deletion flow into the mobile app.

## Routes

```
app/(tabs)/
  index.tsx                  # Home (unchanged from Phase 6)
  purchases.tsx              # List (unchanged)
  reminders.tsx              # NEW: Upcoming/History Tabs + dismiss action
  search.tsx                 # (wired into tab bar — was orphan in Phase 6)
  profile.tsx                # REWRITE: Account / Notifications / Settings / Danger zone
  settings/
    _layout.tsx              # NEW
    lead-days.tsx            # NEW: edit reminder lead time
    timezone.tsx             # NEW: edit timezone + "Use detected"
app/purchase/[id]/claims.tsx # REWRITE: claims list + "Open a claim" CTA
app/purchase/[id].tsx       # EXTEND: enable "Open a claim" button
app/claim/
  _layout.tsx                # NEW
  new.tsx                    # NEW: open a claim; pick a purchase if no purchaseId
  [id].tsx                   # NEW: claim detail with status transition + edit
app/delete-account.tsx       # NEW: 2-step confirmation flow
```

## New / changed files

- `src/lib/settings.ts` — typed KV over AsyncStorage (theme, timezone, push-prompt state)
- `src/lib/claims.ts` — `ALLOWED_TRANSITIONS`, `nextStatuses`, `statusTone` (mirrors server)
- `src/components/Switch.tsx` — token-driven Switch wrapper
- `src/components/Input.tsx` — adds `multiline` + `numberOfLines`
- `src/api/devices.ts` — `registerDevice`, `unregisterDevice`
- `src/api/auth.ts` — adds `deleteMe`
- `src/api/reminders.ts` — rewrite: imports from `@acme/shared`; adds `dismissReminder`
- `src/api/claims.ts` — rewrite: imports from `@acme/shared`; adds `createClaim`, `patchClaim`, `getClaim`
- `src/api/apiKeys.ts` — adds `claims.detail(id)`, `devices.all()`
- `src/theme/ThemeProvider.tsx` — `preference: "system" | "light" | "dark"` + `setPreference`
- `src/notifications/PushRegistration.tsx` — registers Expo push token after sign-in (gated by `EXPO_PUBLIC_PUSH_ENABLED`)
- `src/notifications/usePushHandler.ts` — foreground banner + tap-deep-link to `/purchase/[id]`
- `app/_layout.tsx` — wires `PushRegistration` + `PushWiring`
- `app.json` — adds `expo-notifications` plugin
- `apps/api/src/routes/purchases.ts` — `onPurchaseMutated(env, db, id)` now called in `handleDeletePurchase` (3 of 4 paths were already wired; Phase 7 finishes the 4th)

## Patterns established

1. **`ALLOWED_TRANSITIONS` mirror** — mobile form's status `OptionPicker` filters options to the legal next-states per current status. Same map as the server's `apps/api/src/routes/claims.ts`.
2. **Per-screen permission gating** — `PushRegistration` no-ops when `EXPO_PUBLIC_PUSH_ENABLED !== "true"`, so the Expo Go dev workflow doesn't crash on missing iOS push entitlements.
3. **Tap deep-link from notification** — `addNotificationResponseReceivedListener` reads `data.purchaseId` and calls `router.push("/purchase/[id]")`. No `Linking` config needed.
4. **Account deletion sequencing** — `await deleteMe(api)` (clears server state) → `signOut()` (clears Clerk session) → `queryClient.clear()` (nukes persisted AsyncStorage cache) → `router.replace("/")`. Auth-gate then redirects to sign-in.
5. **Dark mode override** — `ThemeProvider` reads `themePreference` from settings on mount, exposes `setPreference(next)` that writes through to AsyncStorage. RN's `Appearance.setColorScheme(...)` is called so system surfaces (StatusBar) follow.

## Push deep-link contract

Backend queue messages must carry `purchaseId` (and optionally `reminderId`)
in the notification's `data` payload. Mobile's tap handler routes:

```
data = { purchaseId: "01H...", reminderId: "01H..." } →
  router.push("/purchase/[id]?reminderId=...")
```

Backend's reminder push producer (Phase 4) is expected to populate `data`.

## Out of scope (Phase 8+)

- Mutation outbox + replay (Phase 8)
- Optimistic updates + rollback (Phase 8)
- Accessibility audit, full dark mode pass, dynamic type (Phase 8)
- EAS Build profiles beyond Phase 5 stub (Phase 9)
- App icon, splash, store assets (Phase 9)
- ADR-0007 / ADR-0008 (Phase 9)
