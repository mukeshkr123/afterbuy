// Design tokens for the Acme mobile app.
//
// Color strategy: "Restrained" — tinted neutrals + a single accent at ≤10%
// of the surface area. The accent hue (indigo) lives in OKLCH space; the
// final pixel values are stored as hex for RN compatibility. Swap these
// tokens to rebrand without touching components.
//
// All primitives consume `useTheme()` and never read tokens directly.

export type ThemeName = "light" | "dark";

export interface Tokens {
  readonly name: ThemeName;
  readonly colors: {
    bg: string;
    surface: string;
    surfaceMuted: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    accentText: string;
    success: string;
    warning: string;
    danger: string;
    dangerSurface: string;
  };
  readonly spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  readonly radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  readonly type: {
    body: { fontSize: number; lineHeight: number };
    bodySmall: { fontSize: number; lineHeight: number };
    title: { fontSize: number; lineHeight: number };
    display: { fontSize: number; lineHeight: number };
  };
  readonly elevation: {
    0: number;
    1: number;
    2: number;
  };
  readonly motion: {
    durationFast: number;
    durationBase: number;
    ease: string;
  };
}

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

const RADIUS = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

const TYPE = {
  body: { fontSize: 16, lineHeight: 22 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 22, lineHeight: 28 },
  display: { fontSize: 32, lineHeight: 38 },
} as const;

const ELEVATION = { 0: 0, 1: 2, 2: 8 } as const;

const MOTION = {
  durationFast: 120,
  durationBase: 220,
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

export const light: Tokens = {
  name: "light",
  colors: {
    bg: "#FBFBFD",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F1F4",
    text: "#0B0B10",
    textMuted: "#5A5A66",
    border: "#E4E4EA",
    accent: "#4F46E5",
    accentText: "#FFFFFF",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    dangerSurface: "#FEE2E2",
  },
  spacing: SPACING,
  radius: RADIUS,
  type: TYPE,
  elevation: ELEVATION,
  motion: MOTION,
};

export const dark: Tokens = {
  ...light,
  name: "dark",
  colors: {
    bg: "#0B0B10",
    surface: "#14141B",
    surfaceMuted: "#1C1C25",
    text: "#F5F5F7",
    textMuted: "#9999A6",
    border: "#26262F",
    accent: "#818CF8",
    accentText: "#0B0B10",
    success: "#4ADE80",
    warning: "#FBBF24",
    danger: "#F87171",
    dangerSurface: "#3F1D1D",
  },
};
