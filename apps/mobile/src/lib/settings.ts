import { storage } from "./storage";

export type ThemePreference = "system" | "light" | "dark";

export interface SettingsShape {
  themePreference: ThemePreference;
  timezone: string | null;
  pushPromptDismissedAt: string | null;
  authOnboardingPending: boolean;
  authOnboardingCompletedAt: string | null;
}

const KEY = "app:settings:v1";

const DEFAULTS: SettingsShape = {
  themePreference: "system",
  timezone: null,
  pushPromptDismissedAt: null,
  authOnboardingPending: false,
  authOnboardingCompletedAt: null,
};

export async function readSettings(): Promise<SettingsShape> {
  const raw = await storage.getItem(KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsShape>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeSettings(
  patch: Partial<SettingsShape>
): Promise<SettingsShape> {
  const current = await readSettings();
  const next = { ...current, ...patch };
  await storage.setItem(KEY, JSON.stringify(next));
  return next;
}
