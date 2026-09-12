# AfterBuy Play Store India Launch Checklist

AfterBuy's first Play Store release is India-only, English-language, free, and
account-required. Do not add premium copy, usage quotas, subscriptions, trials,
or upgrade prompts for this launch.

## App Access

- Target audience: Adults 18+.
- App access: account required.
- Review access: provide Google Play reviewer credentials for a clean test
  account with sample purchases, receipts, reminders, and claims.
- Auth methods on Android: email/password and Google. Apple sign-in is hidden on
  Android.

## Store Listing

- Country availability: India only.
- Default purchase currency in app-created records: INR.
- App category: productivity or shopping support, depending on final Play
  Console positioning.
- Screenshots must show real app surfaces: welcome, home, purchase list, add
  purchase, receipt attach, reminders, and settings.
- Avoid claims that reminders are guaranteed. Use best-effort wording because
  OS notification delivery can vary.

## Data Safety

Disclose data the app collects or stores for core functionality:

- Account identifiers and email through Clerk authentication.
- Purchase records, merchants, dates, prices, notes, claims, reminders, and
  preferences.
- Receipt images uploaded by the user.
- Push notification tokens for reminder delivery.
- Crash/error diagnostics through Sentry when configured.

Do not disclose behavioral analytics unless a future release adds it.

## Required Public URLs

The Play Console and app release environment must use HTTPS URLs supplied by the
operator:

- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_ACCOUNT_DELETION_URL`
- Optional: `EXPO_PUBLIC_TERMS_URL`

The deletion URL must let users request account and data deletion outside the
app. The in-app delete-account screen must continue to work for signed-in users.

## Release Environment

Production mobile builds must set:

- `EXPO_PUBLIC_API_BASE_URL=https://api.afterbuy.app`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `EXPO_PUBLIC_PUSH_ENABLED=true`
- `EXPO_PUBLIC_EAS_PROJECT_ID=...`
- `EXPO_PUBLIC_SENTRY_DSN=...`
- `EXPO_PUBLIC_APP_ENV=production`
- `EXPO_PUBLIC_SUPPORT_EMAIL=support@afterbuy.app`
- `SENTRY_AUTH_TOKEN=...` as a production secret for Sentry source maps

Run `pnpm dlx expo-doctor` before release. The known remaining warning is that
native folders are committed, so native config must be kept in sync manually.
