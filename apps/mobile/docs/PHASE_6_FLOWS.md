# Phase 6 — Mobile Core Flows

Phase 6 wires the purchase lifecycle into the mobile app: infinite-scroll
list with debounced search, detail screen, create/edit form with
category-default date prefill, delivery-status control, home with upcoming
deadlines + recent purchases + quick add, delete-with-undo toast, and a
search route reachable via deep link.

## Routes

```
app/(tabs)/index.tsx       # Home — Upcoming (30d horizon) + Recent (5) + Quick add
app/(tabs)/purchases.tsx   # Infinite list + search input + Add button + undo toast
app/(tabs)/search.tsx      # Standalone search route (deep link acme://search)
app/purchase/_layout.tsx
app/purchase/new.tsx       # Create form
app/purchase/[id].tsx      # Detail + delivery picker + delete dialog + undo toast
app/purchase/[id]/edit.tsx
app/purchase/[id]/receipts.tsx  # Phase 6.4 stub (no expo-image-picker yet)
app/purchase/[id]/claims.tsx    # Phase 7 placeholder
```

## New components / hooks

- `src/components/FormError.tsx` — non-field error banner
- `src/components/DateField.tsx` — `YYYY-MM-DD` text input with schema validation
- `src/components/OptionPicker.tsx` — Sheet-backed single-select picker
- `src/components/UndoableToast.tsx` — Toast variant with action button
- `src/components/PurchaseForm.tsx` — shared form (new + edit routes)
- `src/hooks/useDebouncedValue.ts` — typed debounce (300ms default)
- `src/hooks/useApiError.ts` — `fromCaught(e)` → `{ message, fields }`
- `src/lib/date.ts` — `isIsoDate`, `todayIso`, `addDays`, `daysBetween`, `deriveReturnDeadline`
- `src/api/apiKeys.ts` — central query-key factory
- `src/api/reminders.ts` — stub (`/v1/reminders`)
- `src/api/claims.ts` — stub (`/v1/claims`)
- `src/api/purchases.ts` — adds `uploadReceipt` (signature only, used in Phase 6.4 stub)

## Patterns established

1. **`useInfiniteQuery`** for the list, with `getNextPageParam` reading
   `nextCursor` from `PurchaseListResponse`.
2. **First `useMutation` precedent** in the codebase: `createPurchase`,
   `patchPurchase`, `deletePurchase`, `restorePurchase`. Each does
   `qc.invalidateQueries({ queryKey: ["purchases"] })` on success.
3. **Per-field errors** via `ApiError.fields` (returned by the API client
   on `validation_failed`). The form wires each `<Input>`/`<DateField>`/
   `<OptionPicker>` to its corresponding field error.
4. **Delete-with-undo**: Dialog confirms → `softDelete.mutate()` → on
   success, `UndoableToast` appears for 5 seconds with an "Undo" action
   that calls `restorePurchase`.
5. **Category-default date prefill**: when the form's `category` field
   changes and `returnDeadlineAt` is empty, the form auto-fills it from
   `GET /v1/meta/categories` defaults.

## Phase 6.4 status

`expo-image-picker` is not installed. The receipts capture screen wires
the upload button + a stub message. The `uploadReceipt(api, id, file)`
signature is in `src/api/purchases.ts` so a follow-up that installs the
picker and enables native prebuild can wire it as a one-liner.

## Out of scope (Phase 7+)

- Claims open / edit (Phase 7)
- Reminders screen real data (Phase 7)
- `expo-notifications` integration (Phase 7)
- Settings (Phase 7.5)
- Account deletion (Phase 7.7)
- Optimistic updates + mutation outbox (Phase 8)
