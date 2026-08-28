import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface StatusPillProps {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  quiet?: boolean | undefined;
}

export function StatusPill({
  label,
  tone = "neutral",
  quiet = false,
}: StatusPillProps) {
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
          paddingHorizontal: quiet ? tokens.spacing.sm + 2 : tokens.spacing.md,
          paddingVertical: quiet ? 2 : tokens.spacing.xs,
        },
      ]}
    >
      <Text
        style={{
          color,
          fontSize: quiet
            ? tokens.type.caption.fontSize
            : tokens.type.caption.fontSize,
          lineHeight: quiet
            ? tokens.type.caption.lineHeight
            : tokens.type.caption.lineHeight,
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
