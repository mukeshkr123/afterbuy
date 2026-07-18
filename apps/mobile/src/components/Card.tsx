import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface CardProps {
  children: ReactNode;
  tone?: "default" | "muted" | "danger";
  title?: string;
  style?: object;
}

export function Card({ children, tone = "default", title, style }: CardProps) {
  const { tokens } = useTheme();
  const backgroundColor =
    tone === "muted"
      ? tokens.colors.surfaceMuted
      : tone === "danger"
        ? tokens.colors.dangerSurface
        : tokens.colors.surface;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          borderColor:
            tone === "danger" ? tokens.colors.danger : tokens.colors.border,
        },
        style,
      ]}
    >
      {title ? (
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: tokens.type.title.fontSize,
            fontWeight: "700",
            marginBottom: tokens.spacing.sm,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
