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
  type AccentPreference,
  type ReduceMotionPreference,
  type TextSizePreference,
  type ThemePreference,
} from "../lib/settings";

export const ACCENT_OPTIONS: Record<
  AccentPreference,
  {
    label: string;
    light: {
      primary: string;
      pressed: string;
      soft: string;
      focus: string;
      onPrimary: string;
    };
    dark: {
      primary: string;
      pressed: string;
      soft: string;
      focus: string;
      onPrimary: string;
    };
  }
> = {
  indigo: {
    label: "Indigo",
    light: {
      primary: "#5B46F6",
      pressed: "#4934DE",
      soft: "#EFEDFF",
      focus: "#4338CA",
      onPrimary: "#FFFFFF",
    },
    dark: {
      primary: "#A99EFF",
      pressed: "#C3BCFF",
      soft: "#27224A",
      focus: "#B8AFFF",
      onPrimary: "#15123A",
    },
  },
  green: {
    label: "Green",
    light: {
      primary: "#16A34A",
      pressed: "#15803D",
      soft: "#E7F6EC",
      focus: "#166534",
      onPrimary: "#FFFFFF",
    },
    dark: {
      primary: "#86EFAC",
      pressed: "#BBF7D0",
      soft: "#123622",
      focus: "#BBF7D0",
      onPrimary: "#052E16",
    },
  },
  amber: {
    label: "Amber",
    light: {
      primary: "#D97706",
      pressed: "#B45309",
      soft: "#FFF4D6",
      focus: "#92400E",
      onPrimary: "#FFFFFF",
    },
    dark: {
      primary: "#FBBF24",
      pressed: "#FCD34D",
      soft: "#392A10",
      focus: "#FCD34D",
      onPrimary: "#281500",
    },
  },
  red: {
    label: "Red",
    light: {
      primary: "#EF4444",
      pressed: "#DC2626",
      soft: "#FDEBEC",
      focus: "#B91C1C",
      onPrimary: "#FFFFFF",
    },
    dark: {
      primary: "#FCA5A5",
      pressed: "#FECACA",
      soft: "#3B1B1F",
      focus: "#FECACA",
      onPrimary: "#3A0A0A",
    },
  },
  slate: {
    label: "Slate",
    light: {
      primary: "#1F2937",
      pressed: "#111827",
      soft: "#E5E7EB",
      focus: "#111827",
      onPrimary: "#FFFFFF",
    },
    dark: {
      primary: "#D1D5DB",
      pressed: "#F3F4F6",
      soft: "#2A2F39",
      focus: "#F3F4F6",
      onPrimary: "#111827",
    },
  },
};

export const TEXT_SIZE_OPTIONS: Record<TextSizePreference, number> = {
  small: 0.92,
  medium: 1,
  large: 1.12,
};

export interface ThemeContextValue {
  tokens: Tokens;
  /**
   * The resolved scheme. Screens must read this rather than comparing a color
   * token against a literal — `tokens.colors.bg` is `#FBFBFD` in light mode, so
   * the old `bg !== "#FFFFFF"` idiom was always true.
   */
  isDark: boolean;
  reducedMotion: boolean;
  preference: ThemePreference;
  accentPreference: AccentPreference;
  textSizePreference: TextSizePreference;
  reduceMotionPreference: ReduceMotionPreference;
  setPreference: (next: ThemePreference) => Promise<void>;
  setAccentPreference: (next: AccentPreference) => Promise<void>;
  setTextSizePreference: (next: TextSizePreference) => Promise<void>;
  setReduceMotionPreference: (next: ReduceMotionPreference) => Promise<void>;
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

function scaleType(
  tokens: Tokens,
  preference: TextSizePreference
): Tokens["type"] {
  const factor = TEXT_SIZE_OPTIONS[preference];
  if (factor === 1) return tokens.type;
  return Object.fromEntries(
    Object.entries(tokens.type).map(([key, value]) => [
      key,
      {
        fontSize: Math.round(value.fontSize * factor),
        lineHeight: Math.round(value.lineHeight * factor),
      },
    ])
  ) as Tokens["type"];
}

function withAppearanceTokens(
  base: Tokens,
  accentPreference: AccentPreference,
  textSizePreference: TextSizePreference
): Tokens {
  const accent = ACCENT_OPTIONS[accentPreference][base.name];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: accent.primary,
      onPrimary: accent.onPrimary,
      focus: accent.focus,
      accent: accent.primary,
      accentText: accent.onPrimary,
      accentSoft: accent.soft,
      action: {
        ...base.colors.action,
        primary: accent.primary,
        primaryPressed: accent.pressed,
        onPrimary: accent.onPrimary,
        focus: accent.focus,
      },
    },
    type: scaleType(base, textSizePreference),
  };
}

function resolveReducedMotion(
  preference: ReduceMotionPreference,
  system: boolean
): boolean {
  if (preference === "reduced") return true;
  if (preference === "standard") return false;
  return system;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const systemReducedMotion = useReducedMotion();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [accentPreference, setAccentPreferenceState] =
    useState<AccentPreference>("indigo");
  const [textSizePreference, setTextSizePreferenceState] =
    useState<TextSizePreference>("medium");
  const [reduceMotionPreference, setReduceMotionPreferenceState] =
    useState<ReduceMotionPreference>("system");

  useEffect(() => {
    void readSettings().then((s) => {
      setPreferenceState(s.themePreference);
      setAccentPreferenceState(s.accentPreference);
      setTextSizePreferenceState(s.textSizePreference);
      setReduceMotionPreferenceState(s.reduceMotionPreference);
    });
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await writeSettings({ themePreference: next });
  }, []);

  const setAccentPreference = useCallback(async (next: AccentPreference) => {
    setAccentPreferenceState(next);
    await writeSettings({ accentPreference: next });
  }, []);

  const setTextSizePreference = useCallback(
    async (next: TextSizePreference) => {
      setTextSizePreferenceState(next);
      await writeSettings({ textSizePreference: next });
    },
    []
  );

  const setReduceMotionPreference = useCallback(
    async (next: ReduceMotionPreference) => {
      setReduceMotionPreferenceState(next);
      await writeSettings({ reduceMotionPreference: next });
    },
    []
  );

  const effective = resolveScheme(preference, system);
  const reducedMotion = resolveReducedMotion(
    reduceMotionPreference,
    systemReducedMotion
  );
  const tokens = useMemo(
    () =>
      withAppearanceTokens(
        effective === "dark" ? dark : light,
        accentPreference,
        textSizePreference
      ),
    [accentPreference, effective, textSizePreference]
  );

  useEffect(() => {
    setAppearance(effective);
  }, [effective]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens,
      isDark: effective === "dark",
      reducedMotion,
      preference,
      accentPreference,
      textSizePreference,
      reduceMotionPreference,
      setPreference,
      setAccentPreference,
      setTextSizePreference,
      setReduceMotionPreference,
    }),
    [
      accentPreference,
      effective,
      preference,
      reduceMotionPreference,
      reducedMotion,
      setAccentPreference,
      setPreference,
      setReduceMotionPreference,
      setTextSizePreference,
      textSizePreference,
      tokens,
    ]
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
