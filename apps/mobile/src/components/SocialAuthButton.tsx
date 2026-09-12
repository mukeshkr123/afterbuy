import React from "react";
import {
  ActivityIndicator,
  Image,
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
  const { tokens } = useTheme();

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
          borderRadius: 14,
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
            <Image
              source={require("../../assets/google_g_logo.png")}
              style={styles.googleIcon}
              resizeMode="contain"
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
    height: 50,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 10,
  },
  googleIcon: {
    width: 19,
    height: 19,
    marginRight: 10,
  },
  label: {
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
