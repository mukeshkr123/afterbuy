import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface ToastProps {
  message: string | null;
  tone?: "neutral" | "success" | "danger";
  onDismiss?: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  tone = "neutral",
  onDismiss,
  durationMs = 3000,
}: ToastProps) {
  const { tokens } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: tokens.motion.durationFast,
        useNativeDriver: true,
      }).start(() => setVisible(false));
      return;
    }
    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: tokens.motion.durationFast,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onDismiss?.();
      });
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss, opacity, tokens.motion.durationFast]);

  if (!visible) return null;

  const backgroundColor =
    tone === "success"
      ? tokens.colors.success
      : tone === "danger"
        ? tokens.colors.danger
        : tokens.colors.surface;

  const color =
    tone === "neutral" ? tokens.colors.text : tokens.colors.accentText;

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.spacing.lg,
            paddingVertical: tokens.spacing.sm + 2,
            borderColor: tokens.colors.border,
            opacity,
          },
        ]}
      >
        <Text
          style={{
            color,
            fontSize: tokens.type.body.fontSize,
            fontWeight: "600",
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    borderWidth: 1,
    maxWidth: "85%",
  },
});
