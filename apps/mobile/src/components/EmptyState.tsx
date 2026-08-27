import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { useTheme } from "../theme/ThemeProvider";

export interface EmptyStateProps {
  title: string;
  message?: string | null | undefined;
  /** Decorative Ionicons glyph shown above the title. */
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  /** The next step to offer. An empty screen without one is a dead end. */
  action?: { label: string; onPress: () => void } | undefined;
  /** Tighten vertical padding and icon size for secondary/embedded sections. */
  compact?: boolean | undefined;
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  compact = false,
}: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: compact ? tokens.spacing.md : tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.md,
          gap: compact ? tokens.spacing.xs : tokens.spacing.xs + 2,
        },
      ]}
    >
      {icon ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            compact ? styles.iconRingCompact : styles.iconRing,
            {
              backgroundColor: tokens.colors.accentSoft,
              marginBottom: compact ? 2 : tokens.spacing.xs,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={compact ? 20 : 22}
            color={tokens.colors.accent}
          />
        </View>
      ) : null}
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: compact
            ? tokens.type.headline.fontSize
            : tokens.type.headline.fontSize + 1,
          fontWeight: "700",
          textAlign: "center",
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.type.bodySmall.fontSize,
            lineHeight: tokens.type.bodySmall.lineHeight,
            textAlign: "center",
            maxWidth: compact ? 280 : 320,
          }}
        >
          {message}
        </Text>
      ) : null}
      {action ? (
        <View
          style={{ marginTop: compact ? tokens.spacing.xs : tokens.spacing.sm }}
        >
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRingCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
