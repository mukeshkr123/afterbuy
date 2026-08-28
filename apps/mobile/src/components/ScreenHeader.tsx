import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";
import { AppIcon } from "./AppIcon";

export interface ScreenHeaderAction {
  /** Optional Ionicons glyph name, e.g. "add" or "ellipsis-horizontal". */
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  /** Text label, e.g. "Edit" or "Cancel". */
  text?: string | undefined;
  /** Required accessibility label if icon is used without text. */
  label?: string | undefined;
  onPress: () => void;
  tone?: "accent" | "danger" | "neutral" | undefined;
}

export interface ScreenHeaderProps {
  title: string;
  /** Omit to hide the back control (root tab screens). */
  onBack?: (() => void) | undefined;
  showBack?: boolean | undefined;
  action?: ScreenHeaderAction | undefined;
  rightNode?: ReactNode | undefined;
}

/**
 * The back / title / action bar repeated across every non-root screen.
 *
 * Controls are at least 44×44 to satisfy WCAG 2.5.5; the visual glyph stays small,
 * the hit area does not.
 */
export function ScreenHeader({
  title,
  onBack,
  showBack = true,
  action,
  rightNode,
}: ScreenHeaderProps) {
  const { tokens } = useTheme();
  const router = useRouter();

  // Deep links can land on a screen with no history — fall back to the tab root
  // rather than leaving a dead back button.
  const goBack =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    });

  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.control, pressed && { opacity: 0.6 }]}
        >
          <AppIcon name="back" size={22} color={tokens.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.control} />
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: tokens.colors.text,
            fontSize: tokens.type.headline.fontSize,
          },
        ]}
      >
        {title}
      </Text>

      {rightNode ? (
        <View style={[styles.control, styles.controlEnd]}>{rightNode}</View>
      ) : action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label ?? action.text ?? "Action"}
          hitSlop={8}
          style={({ pressed }) => [
            styles.control,
            styles.controlEnd,
            pressed && { opacity: 0.6 },
          ]}
        >
          {action.text ? (
            <Text
              style={{
                color:
                  action.tone === "accent"
                    ? tokens.colors.accent
                    : action.tone === "danger"
                      ? tokens.colors.danger
                      : tokens.colors.text,
                fontSize: tokens.type.bodySmall.fontSize,
                fontWeight: "600",
              }}
            >
              {action.text}
            </Text>
          ) : action.icon ? (
            <Ionicons name={action.icon} size={22} color={tokens.colors.text} />
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.control} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  control: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  controlEnd: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
