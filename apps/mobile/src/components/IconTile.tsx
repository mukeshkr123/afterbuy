import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export type IconTileTone =
  "accent" | "success" | "warning" | "info" | "neutral";

export interface IconTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: IconTileTone;
  size?: "md" | "lg";
}

/**
 * The tinted rounded square behind a leading icon. Decorative only — the
 * adjacent label carries the meaning, so it is hidden from screen readers.
 */
export function IconTile({
  icon,
  tone = "accent",
  size = "md",
}: IconTileProps) {
  const { tokens } = useTheme();

  const { bg, fg } = {
    accent: { bg: tokens.colors.accentSoft, fg: tokens.colors.accent },
    success: { bg: tokens.colors.successSoft, fg: tokens.colors.successText },
    warning: { bg: tokens.colors.warningSoft, fg: tokens.colors.warning },
    info: { bg: tokens.colors.infoSoft, fg: tokens.colors.info },
    neutral: { bg: tokens.colors.neutralSoft, fg: tokens.colors.textSubtle },
  }[tone];

  const box = size === "lg" ? 72 : 44;
  const glyph = size === "lg" ? 32 : 22;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        {
          width: box,
          height: box,
          borderRadius: tokens.radius.lg,
          backgroundColor: bg,
        },
      ]}
    >
      <Ionicons name={icon} size={glyph} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
});
