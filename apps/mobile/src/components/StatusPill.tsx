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
      ? tokens.colors.success
      : tone === "warning"
        ? tokens.colors.warning
        : tone === "danger"
          ? tokens.colors.danger
          : tone === "accent"
            ? tokens.colors.accent
            : tokens.colors.surfaceMuted;
  const color =
    tone === "neutral" ? tokens.colors.text : tokens.colors.accentText;
  return (
    <View
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
          fontSize: tokens.type.bodySmall.fontSize,
          fontWeight: "600",
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
