// Design tokens for the AfterBuy mobile experience.
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
    /** Semantic surface levels. */
    surface: string;
    surfaceRaised: string;
    surfaceMuted: string;
    primary: string;
    onPrimary: string;
    text: string;
    textStrong: string;
    /** Body detail text: dimmer than `text`, darker than `textMuted`. */
    textSubtle: string;
    textMuted: string;
    border: string;
    outline: string;
    focus: string;
    disabled: string;
    disabledText: string;
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
    warningText: string;
    infoText: string;
    danger: string;
    dangerText: string;
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
    largeTitle: { fontSize: number; lineHeight: number };
    title: { fontSize: number; lineHeight: number };
    headline: { fontSize: number; lineHeight: number };
    body: { fontSize: number; lineHeight: number };
    subheadline: { fontSize: number; lineHeight: number };
    caption: { fontSize: number; lineHeight: number };
    /** Backwards-compatible aliases while screens migrate to named roles. */
    bodySmall: { fontSize: number; lineHeight: number };
    display: { fontSize: number; lineHeight: number };
  };
  readonly target: {
    ios: number;
    android: number;
    web: number;
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
  largeTitle: { fontSize: 34, lineHeight: 42 },
  title: { fontSize: 22, lineHeight: 30 },
  headline: { fontSize: 17, lineHeight: 24 },
  body: { fontSize: 17, lineHeight: 25 },
  subheadline: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  bodySmall: { fontSize: 15, lineHeight: 22 },
  display: { fontSize: 34, lineHeight: 42 },
} as const;

const TARGET = { ios: 44, android: 48, web: 44 } as const;

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
    surfaceRaised: "#FFFFFF",
    surfaceMuted: "#F1F1F4",
    primary: "#4F46E5",
    onPrimary: "#FFFFFF",
    text: "#0B0B10",
    textStrong: "#0B0B10",
    textSubtle: "#4B5563",
    textMuted: "#52525E",
    border: "#E4E4EA",
    outline: "#737380",
    focus: "#4338CA",
    disabled: "#E5E7EB",
    disabledText: "#59606B",
    icon: "#5F6470",
    accent: "#4F46E5",
    accentText: "#FFFFFF",
    accentSoft: "#EEF2FF",
    successSoft: "#E7F6EC",
    warningSoft: "#FFF4D6",
    infoSoft: "#EAF2FF",
    neutralSoft: "#F3F4F6",
    info: "#2563EB",
    success: "#166534",
    successText: "#166534",
    warning: "#7C4A03",
    warningText: "#7C4A03",
    infoText: "#1E3A8A",
    danger: "#DC2626",
    dangerText: "#991B1B",
    dangerSurface: "#FDEBEC",
  },
  spacing: SPACING,
  radius: RADIUS,
  shadow: SHADOW,
  type: TYPE,
  target: TARGET,
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
    surfaceRaised: "#1A1A22",
    surfaceMuted: "#1C1C25",
    primary: "#A5B4FC",
    onPrimary: "#15123A",
    text: "#F5F5F7",
    textStrong: "#FFFFFF",
    textSubtle: "#B4B4C0",
    textMuted: "#B4B4C0",
    border: "#34343F",
    outline: "#8A8A98",
    focus: "#A5B4FC",
    disabled: "#30303A",
    disabledText: "#A0A0AC",
    icon: "#B4B4C0",
    accent: "#818CF8",
    accentText: "#0B0B10",
    accentSoft: "#1E1B4B",
    successSoft: "#123524",
    warningSoft: "#3A2B0C",
    infoSoft: "#142B46",
    neutralSoft: "#1C1C25",
    info: "#60A5FA",
    success: "#86EFAC",
    successText: "#86EFAC",
    warning: "#FDE68A",
    warningText: "#FDE68A",
    infoText: "#BFDBFE",
    danger: "#F87171",
    dangerText: "#FCA5A5",
    dangerSurface: "#3F1D1D",
  },
};
