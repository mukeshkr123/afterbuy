import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  size?: "md" | "lg";
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  disabled,
  busy = false,
  variant = "primary",
  size = "md",
  leading,
  style,
}: ButtonProps) {
  const { tokens, reducedMotion } = useTheme();
  const isDisabled = Boolean(disabled || busy);

  const backgroundColor = isDisabled
    ? tokens.colors.disabled
    : variant === "primary"
      ? tokens.colors.action.primary
      : variant === "danger"
        ? tokens.colors.danger
        : variant === "secondary"
          ? tokens.colors.surface
          : "transparent";

  const textColor = isDisabled
    ? tokens.colors.disabledText
    : variant === "primary"
      ? tokens.colors.action.onPrimary
      : variant === "danger"
        ? tokens.colors.accentText
        : variant === "secondary" ||
            variant === "tertiary" ||
            variant === "ghost"
          ? tokens.colors.action.primary
          : tokens.colors.text;

  const minHeight =
    size === "lg" ? 54 : Platform.select({ ios: 44, android: 48, default: 44 });
  const borderRadius = size === "lg" ? tokens.radius.lg : tokens.radius.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          backgroundColor,
          borderColor:
            variant === "secondary" ? tokens.colors.border : "transparent",
          borderRadius,
          paddingVertical:
            size === "lg" ? tokens.spacing.md : tokens.spacing.sm + 2,
          paddingHorizontal: tokens.spacing.lg,
          opacity: pressed && !isDisabled ? 0.9 : 1,
          transform: [
            { scale: pressed && !isDisabled && !reducedMotion ? 0.98 : 1 },
          ],
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {busy && (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.spinner}
          />
        )}
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Text
          style={[
            styles.label,
            { color: textColor, fontSize: tokens.type.body.fontSize },
          ]}
        >
          {label}
        </Text>
      </View>
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
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginRight: 8,
  },
  leading: {
    marginRight: 8,
  },
  label: {
    fontWeight: "600",
  },
});
