import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { announce } from "../lib/accessibility";

// Like Toast, but with an action button. Used for "Purchase deleted" undo.
export interface UndoableToastProps {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  durationMs?: number;
}

export function UndoableToast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 5000,
}: UndoableToastProps) {
  const { tokens, reducedMotion } = useTheme();
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
    announce(message);
    Animated.timing(opacity, {
      toValue: 1,
      duration: reducedMotion ? 0 : tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: reducedMotion ? 0 : tokens.motion.durationFast,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onDismiss?.();
      });
    }, durationMs);
    return () => clearTimeout(timer);
  }, [
    message,
    durationMs,
    onDismiss,
    opacity,
    reducedMotion,
    tokens.motion.durationFast,
  ]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.md,
            opacity,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: tokens.type.body.fontSize,
            flex: 1,
          }}
        >
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={() => {
              onAction();
              setVisible(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text
              style={{
                color: tokens.colors.accent,
                fontWeight: "700",
                marginLeft: tokens.spacing.md,
              }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 96,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
});
