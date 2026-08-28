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
    /** New components should prefer these grouped semantic roles. */
    content: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    action: {
      primary: string;
      primaryPressed: string;
      onPrimary: string;
      focus: string;
    };
    status: {
      success: string;
      successSurface: string;
      warning: string;
      warningSurface: string;
      danger: string;
      dangerSurface: string;
      info: string;
      infoSurface: string;
    };
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
    screenTitle: { fontSize: number; lineHeight: number };
    title: { fontSize: number; lineHeight: number };
    sectionTitle: { fontSize: number; lineHeight: number };
    headline: { fontSize: number; lineHeight: number };
    body: { fontSize: number; lineHeight: number };
    subheadline: { fontSize: number; lineHeight: number };
    label: { fontSize: number; lineHeight: number };
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

const SPACING = { xs: 4, sm: 8, md: 12, lg: 14, xl: 20, xxl: 28 } as const;

const RADIUS = { sm: 6, md: 8, lg: 12, xl: 14, pill: 999 } as const;

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
  screenTitle: { fontSize: 26, lineHeight: 32 },
  title: { fontSize: 20, lineHeight: 26 },
  sectionTitle: { fontSize: 18, lineHeight: 24 },
  headline: { fontSize: 17, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 23 },
  subheadline: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
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
    canvas: "#F7F8FC",
    bg: "#F7F8FC",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceMuted: "#F1F3F8",
    primary: "#5B46F6",
    onPrimary: "#FFFFFF",
    text: "#171724",
    textStrong: "#0C0C16",
    textSubtle: "#475569",
    textMuted: "#596170",
    border: "#E1E4EC",
    outline: "#737380",
    focus: "#4338CA",
    disabled: "#E5E7EB",
    disabledText: "#59606B",
    icon: "#5F6470",
    accent: "#5B46F6",
    accentText: "#FFFFFF",
    accentSoft: "#EFEDFF",
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
    content: {
      primary: "#171724",
      secondary: "#475569",
      tertiary: "#596170",
      inverse: "#FFFFFF",
    },
    action: {
      primary: "#5B46F6",
      primaryPressed: "#4934DE",
      onPrimary: "#FFFFFF",
      focus: "#4338CA",
    },
    status: {
      success: "#166534",
      successSurface: "#E7F6EC",
      warning: "#7C4A03",
      warningSurface: "#FFF4D6",
      danger: "#B4232C",
      dangerSurface: "#FDEBEC",
      info: "#1E3A8A",
      infoSurface: "#EAF2FF",
    },
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
    canvas: "#0C0C14",
    bg: "#0C0C14",
    surface: "#15151F",
    surfaceRaised: "#1B1B27",
    surfaceMuted: "#20202C",
    primary: "#A99EFF",
    onPrimary: "#15123A",
    text: "#F5F5F7",
    textStrong: "#FFFFFF",
    textSubtle: "#B4B4C0",
    textMuted: "#B4B4C0",
    border: "#34343F",
    outline: "#8A8A98",
    focus: "#B8AFFF",
    disabled: "#30303A",
    disabledText: "#A0A0AC",
    icon: "#B4B4C0",
    accent: "#A99EFF",
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
    content: {
      primary: "#F7F7FA",
      secondary: "#C4C4CF",
      tertiary: "#ABABB8",
      inverse: "#11111A",
    },
    action: {
      primary: "#A99EFF",
      primaryPressed: "#C2BAFF",
      onPrimary: "#15123A",
      focus: "#B8AFFF",
    },
    status: {
      success: "#86EFAC",
      successSurface: "#123524",
      warning: "#FDE68A",
      warningSurface: "#3A2B0C",
      danger: "#FCA5A5",
      dangerSurface: "#3F1D1D",
      info: "#BFDBFE",
      infoSurface: "#142B46",
    },
  },
};
