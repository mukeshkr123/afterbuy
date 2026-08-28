import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export interface ListItemProps {
  title: string;
  subtitle?: string | null | undefined;
  /** Third line, dimmer than `subtitle` — deadlines, counts, timestamps. */
  detail?: string | null | undefined;
  density?: "default" | "compact" | undefined;
  /** Leading slot, typically an <IconTile>. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Show a chevron after `trailing`. Implies the row navigates somewhere. */
  chevron?: boolean | undefined;
  /** Suppress the hairline separator on the last row of a group. */
  divider?: boolean | undefined;
  onPress?: (() => void) | undefined;
}

export function ListItem({
  title,
  subtitle,
  detail,
  density = "default",
  leading,
  trailing,
  chevron = false,
  divider = true,
  onPress,
}: ListItemProps) {
  const { tokens } = useTheme();
  const compact = density === "compact";
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          gap: compact ? tokens.spacing.sm + 2 : tokens.spacing.md,
          paddingHorizontal: compact ? tokens.spacing.md : tokens.spacing.lg,
          paddingVertical: compact ? tokens.spacing.sm + 2 : tokens.spacing.md,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: tokens.colors.border,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
      {leading}
      <View style={[styles.body, { gap: compact ? 1 : 2 }]}>
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: compact
              ? tokens.type.subheadline.fontSize + 1
              : tokens.type.body.fontSize,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: tokens.colors.textSubtle,
              fontSize: tokens.type.bodySmall.fontSize,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        {detail ? (
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.caption.fontSize + 1,
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={tokens.colors.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    ...(Platform.OS === "android" ? { minHeight: 60 } : null),
  },
  body: { flex: 1, justifyContent: "center" },
});
