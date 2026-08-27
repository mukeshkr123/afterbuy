import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface StatusPillProps {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  const { tokens } = useTheme();
  const backgroundColor =
    tone === "success"
      ? tokens.colors.successSoft
      : tone === "warning"
        ? tokens.colors.warningSoft
        : tone === "danger"
          ? tokens.colors.dangerSurface
          : tone === "accent"
            ? tokens.colors.accentSoft
            : tokens.colors.surfaceMuted;
  const color =
    tone === "success"
      ? tokens.colors.successText
      : tone === "warning"
        ? tokens.colors.warningText
        : tone === "danger"
          ? tokens.colors.dangerText
          : tone === "accent"
            ? tokens.colors.primary
            : tokens.colors.text;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.pill,
        {
          backgroundColor,
          borderRadius: tokens.radius.pill,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
      ]}
    >
      <Text
        style={{
          color,
          fontSize: tokens.type.caption.fontSize,
          lineHeight: tokens.type.caption.lineHeight,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start" },
});
