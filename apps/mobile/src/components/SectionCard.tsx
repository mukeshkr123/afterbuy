import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface SectionCardProps {
  children: ReactNode;
  /** Rendered above the content, inside the card padding. */
  title?: string | undefined;
  /** `danger` tints the surface and border for destructive contexts. */
  tone?: "default" | "muted" | "danger" | undefined;
  /** Makes the whole card a button. */
  onPress?: (() => void) | undefined;
  /**
   * Drop the internal padding. Use when the card holds full-bleed rows that
   * bring their own padding (grouped lists).
   */
  flush?: boolean | undefined;
  style?: ViewStyle | undefined;
}

/**
 * The elevated surface used for every grouped block in the app.
 *
 * Elevation comes from `tokens.shadow.card`, which is empty in dark mode — the
 * border carries the separation there instead.
 */
export function SectionCard({
  children,
  title,
  tone = "default",
  onPress,
  flush = false,
  style,
}: SectionCardProps) {
  const { tokens, reducedMotion } = useTheme();

  const surface: ViewStyle = {
    backgroundColor:
      tone === "muted"
        ? tokens.colors.surfaceMuted
        : tone === "danger"
          ? tokens.colors.dangerSurface
          : tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    borderColor:
      tone === "danger" ? tokens.colors.danger : tokens.colors.border,
    padding: flush ? 0 : tokens.spacing.lg,
    ...tokens.shadow.card,
  };

  const content = (
    <>
      {title ? (
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.text,
              fontSize: tokens.type.body.fontSize,
              marginBottom: tokens.spacing.sm,
              paddingHorizontal: flush ? tokens.spacing.lg : 0,
              paddingTop: flush ? tokens.spacing.lg : 0,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          surface,
          pressed && {
            opacity: 0.92,
            transform: [{ scale: reducedMotion ? 1 : 0.99 }],
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, surface, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  title: {
    fontWeight: "700",
  },
});
