import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export interface SocialAuthButtonProps {
  provider: "apple" | "google";
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SocialAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: SocialAuthButtonProps) {
  const { tokens, isDark } = useTheme();

  const isApple = provider === "apple";
  const label = isApple ? "Continue with Apple" : "Continue with Google";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: 16,
          ...tokens.shadow.raised,
        },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tokens.colors.text} />
      ) : (
        <View style={styles.contentRow}>
          {isApple ? (
            <Ionicons
              name="logo-apple"
              size={20}
              color={tokens.colors.text}
              style={styles.icon}
            />
          ) : (
            <Ionicons
              name="logo-google"
              size={18}
              color={isDark ? "#FFFFFF" : "#4285F4"}
              style={styles.icon}
            />
          )}
          <Text style={[styles.label, { color: tokens.colors.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 54,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
