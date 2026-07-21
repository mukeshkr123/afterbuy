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
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          padding: tokens.spacing.xl,
          gap: tokens.spacing.sm,
        },
      ]}
    >
      {icon ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.iconRing,
            {
              backgroundColor: tokens.colors.accentSoft,
              marginBottom: tokens.spacing.xs,
            },
          ]}
        >
          <Ionicons name={icon} size={30} color={tokens.colors.accent} />
        </View>
      ) : null}
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: tokens.type.title.fontSize,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.type.body.fontSize,
            lineHeight: tokens.type.body.lineHeight,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: tokens.spacing.md }}>
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
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
