import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function Button({
  label,
  onPress,
  disabled,
  busy = false,
  variant = "primary",
}: ButtonProps) {
  const { tokens, reducedMotion } = useTheme();

  const backgroundColor = disabled
    ? tokens.colors.disabled
    : variant === "primary"
      ? tokens.colors.accent
      : variant === "danger"
        ? tokens.colors.danger
        : variant === "secondary"
          ? tokens.colors.surface
          : "transparent";

  const textColor = disabled
    ? tokens.colors.disabledText
    : variant === "primary"
      ? tokens.colors.accentText
      : variant === "danger"
        ? tokens.colors.accentText
        : tokens.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor:
            variant === "secondary" ? tokens.colors.border : "transparent",
          borderRadius: tokens.radius.md,
          paddingVertical: tokens.spacing.sm + 2,
          paddingHorizontal: tokens.spacing.lg,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: textColor, fontSize: tokens.type.body.fontSize },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: Platform.select({ ios: 44, android: 48, default: 44 }),
  },
  label: {
    fontWeight: "600",
  },
});
