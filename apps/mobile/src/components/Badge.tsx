import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface BadgeProps {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const { tokens } = useTheme();
  const backgroundColor =
    tone === "accent"
      ? tokens.colors.accent
      : tone === "success"
        ? tokens.colors.success
        : tone === "warning"
          ? tokens.colors.warning
          : tone === "danger"
            ? tokens.colors.danger
            : tokens.colors.surfaceMuted;
  const color =
    tone === "neutral" ? tokens.colors.text : tokens.colors.accentText;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          borderRadius: tokens.radius.pill,
          paddingHorizontal: tokens.spacing.sm + 2,
          paddingVertical: 2,
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
  badge: {
    alignSelf: "flex-start",
  },
});
