import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}

export function ListItem({
  title,
  subtitle,
  trailing,
  onPress,
}: ListItemProps) {
  const { tokens } = useTheme();
  const Container: typeof Pressable = Pressable;
  return (
    <Container
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
          borderBottomColor: tokens.colors.border,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
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
              color: tokens.colors.textMuted,
              fontSize: tokens.type.bodySmall.fontSize,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    minHeight: 56,
  },
  body: { flex: 1, justifyContent: "center" },
});
