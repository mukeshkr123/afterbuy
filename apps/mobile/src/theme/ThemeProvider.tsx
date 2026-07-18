import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { dark, light, type Tokens } from "./tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

export interface ThemeContextValue {
  tokens: Tokens;
  reducedMotion: boolean;
}

const Ctx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const reducedMotion = useReducedMotion();
  const value = useMemo<ThemeContextValue>(
    () => ({ tokens: scheme === "dark" ? dark : light, reducedMotion }),
    [scheme, reducedMotion]
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

// Helper for imperative reads (e.g. StatusBar style).
export function tokensFor(name: "light" | "dark" | null | undefined): Tokens {
  return name === "dark" ? dark : light;
}

// Re-export so consumers only import from the theme barrel.
export type { Tokens } from "./tokens";
