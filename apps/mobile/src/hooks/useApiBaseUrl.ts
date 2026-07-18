import Constants from "expo-constants";

// Returns the API base URL with safe defaults for local development.
// `EXPO_PUBLIC_API_BASE_URL` is inlined at bundle time by Expo; the
// fallback is `wrangler dev`'s default port (8787). Phase 6+ swaps in a
// per-stage URL based on the build profile.
export function useApiBaseUrl(): string {
  const fromEnv = process.env["EXPO_PUBLIC_API_BASE_URL"];
  if (fromEnv) return fromEnv;
  const extra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined) ??
    undefined;
  if (extra?.apiBaseUrl) return extra.apiBaseUrl;
  return "http://localhost:8787";
}
