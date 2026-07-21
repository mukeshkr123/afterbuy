// Design tokens for the Acme mobile app.
//
// Color strategy: "Restrained" — tinted neutrals + a single accent at ≤10%
// of the surface area. The accent hue (indigo) lives in OKLCH space; the
// final pixel values are stored as hex for RN compatibility. Swap these
// tokens to rebrand without touching components.
//
// All primitives consume `useTheme()` and never read tokens directly.

export type ThemeName = "light" | "dark";

/**
 * Elevation as a ready-to-spread RN style. Screens must never write
 * `shadowColor` inline — spread `tokens.shadow.card` instead so dark mode can
 * flatten every surface at once.
 */
export interface ShadowStyle {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

export interface Tokens {
  readonly name: ThemeName;
  readonly colors: {
    /** Page background behind cards. Slightly cooler than `surface`. */
    canvas: string;
    bg: string;
    surface: string;
    surfaceMuted: string;
    text: string;
    /** Body detail text: dimmer than `text`, darker than `textMuted`. */
    textSubtle: string;
    textMuted: string;
    border: string;
    /** Decorative glyphs — chevrons, placeholder icons. Not for text. */
    icon: string;
    accent: string;
    accentText: string;
    /** Tinted fills for icon tiles and status badges. */
    accentSoft: string;
    successSoft: string;
    warningSoft: string;
    infoSoft: string;
    neutralSoft: string;
    info: string;
    success: string;
    /** Label color on a `successSoft` fill. */
    successText: string;
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
    xl: number;
    pill: number;
  };
  readonly shadow: {
    card: ShadowStyle;
    raised: ShadowStyle;
    none: ShadowStyle;
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

const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const;

// Light-mode elevation. Dark mode overrides these to `{}` — on a dark canvas a
// black shadow reads as smudge, and the border does the separating instead.
const SHADOW = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  none: {},
} as const;

const NO_SHADOW = { card: {}, raised: {}, none: {} } as const;

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
    canvas: "#FAFAFA",
    bg: "#FBFBFD",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F1F4",
    text: "#0B0B10",
    textSubtle: "#4B5563",
    textMuted: "#5A5A66",
    border: "#E4E4EA",
    icon: "#9CA3AF",
    accent: "#4F46E5",
    accentText: "#FFFFFF",
    accentSoft: "#EEF2FF",
    successSoft: "#DCFCE7",
    warningSoft: "#FEF3C7",
    infoSoft: "#EFF6FF",
    neutralSoft: "#F3F4F6",
    info: "#2563EB",
    success: "#16A34A",
    successText: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    dangerSurface: "#FEE2E2",
  },
  spacing: SPACING,
  radius: RADIUS,
  shadow: SHADOW,
  type: TYPE,
  elevation: ELEVATION,
  motion: MOTION,
};

export const dark: Tokens = {
  ...light,
  name: "dark",
  shadow: NO_SHADOW,
  colors: {
    canvas: "#0B0B10",
    bg: "#0B0B10",
    surface: "#14141B",
    surfaceMuted: "#1C1C25",
    text: "#F5F5F7",
    textSubtle: "#B4B4C0",
    textMuted: "#9999A6",
    border: "#26262F",
    icon: "#6B6B78",
    accent: "#818CF8",
    accentText: "#0B0B10",
    accentSoft: "#1E1B4B",
    successSoft: "#052E1B",
    warningSoft: "#3B2A05",
    infoSoft: "#0C2136",
    neutralSoft: "#1C1C25",
    info: "#60A5FA",
    success: "#4ADE80",
    successText: "#4ADE80",
    warning: "#FBBF24",
    danger: "#F87171",
    dangerSurface: "#3F1D1D",
  },
};
