const DEFAULT_SUPPORT_EMAIL = "support@afterbuy.app";

export const SUPPORT_EMAIL =
  process.env["EXPO_PUBLIC_SUPPORT_EMAIL"] ?? DEFAULT_SUPPORT_EMAIL;

export const PRIVACY_POLICY_URL =
  process.env["EXPO_PUBLIC_PRIVACY_POLICY_URL"] ?? "";

export const TERMS_URL = process.env["EXPO_PUBLIC_TERMS_URL"] ?? "";

export const ACCOUNT_DELETION_URL =
  process.env["EXPO_PUBLIC_ACCOUNT_DELETION_URL"] ?? "";

export function mailtoSupport(subject?: string): string {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${SUPPORT_EMAIL}${query}`;
}
