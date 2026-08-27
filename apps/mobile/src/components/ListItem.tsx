import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export interface ListItemProps {
  title: string;
  subtitle?: string | null | undefined;
  /** Third line, dimmer than `subtitle` — deadlines, counts, timestamps. */
  detail?: string | null | undefined;
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
  leading,
  trailing,
  chevron = false,
  divider = true,
  onPress,
}: ListItemProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: tokens.colors.border,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
      {leading}
      <View style={[styles.body, { gap: 2 }]}>
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: tokens.type.body.fontSize,
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
              fontSize: tokens.type.bodySmall.fontSize,
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
    ...(Platform.OS === "android" ? { minHeight: 64 } : null),
  },
  body: { flex: 1, justifyContent: "center" },
});
