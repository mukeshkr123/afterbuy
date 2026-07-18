import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import { dark, light, type Tokens } from "./tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  readSettings,
  writeSettings,
  type ThemePreference,
} from "../lib/settings";

export interface ThemeContextValue {
  tokens: Tokens;
  reducedMotion: boolean;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const Ctx = createContext<ThemeContextValue | null>(null);

function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined
): "light" | "dark" {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return system === "dark" ? "dark" : "light";
}

// `Appearance.setColorScheme` accepts a wider union including
// `"unspecified"`. We always pass a strict "light" | "dark", so the cast
// via `string` is safe and silences the strict-mode mismatch.
function setAppearance(scheme: "light" | "dark"): void {
  if (typeof Appearance.setColorScheme === "function") {
    (Appearance.setColorScheme as (s: string | null | undefined) => void)(
      scheme
    );
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const reducedMotion = useReducedMotion();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void readSettings().then((s) => setPreferenceState(s.themePreference));
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await writeSettings({ themePreference: next });
  }, []);

  const effective = resolveScheme(preference, system);
  useEffect(() => {
    setAppearance(effective);
  }, [effective]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens: effective === "dark" ? dark : light,
      reducedMotion,
      preference,
      setPreference,
    }),
    [effective, reducedMotion, preference, setPreference]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

export function tokensFor(name: "light" | "dark" | null | undefined): Tokens {
  return name === "dark" ? dark : light;
}

export type { Tokens } from "./tokens";
