import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { AppText } from "./AppText";
import { StatusPill, type StatusPillProps } from "./StatusPill";
import { useTheme } from "../theme/ThemeProvider";

export function DeadlineCard({
  title,
  dateLabel,
  detail,
  tone = "accent",
  onPress,
}: {
  title: string;
  dateLabel: string;
  detail: string;
  tone?: NonNullable<StatusPillProps["tone"]>;
  onPress?: () => void;
}) {
  const { tokens, reducedMotion } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            tone === "warning"
              ? tokens.colors.warningSoft
              : tokens.colors.accentSoft,
          borderRadius: tokens.radius.xl,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={[styles.top, { gap: tokens.spacing.md }]}>
        <View style={[styles.icon, { backgroundColor: tokens.colors.surface }]}>
          <AppIcon name="calendar" size={20} color={tokens.colors.accent} />
        </View>
        <View style={styles.copy}>
          <AppText role="headline" tone="strong">
            {title}
          </AppText>
          <AppText role="caption" tone="subtle">
            {dateLabel}
          </AppText>
        </View>
        <StatusPill label={detail} tone={tone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  top: { flexDirection: "row", alignItems: "center" },
  copy: { flex: 1 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
