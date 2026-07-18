import { Text, View } from "react-native";
import { Card, EmptyState, StatusPill } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function HomeScreen() {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.bg,
        padding: tokens.spacing.lg,
        gap: tokens.spacing.lg,
      }}
    >
      <Text
        style={{
          fontSize: tokens.type.display.fontSize,
          fontWeight: "700",
          color: tokens.colors.text,
        }}
      >
        Home
      </Text>
      <Card title="No upcoming deadlines">
        <Text style={{ color: tokens.colors.textMuted }}>
          Your reminders will appear here as soon as you add a purchase.
        </Text>
        <View style={{ marginTop: tokens.spacing.sm }}>
          <StatusPill label="Phase 5 placeholder" tone="accent" />
        </View>
      </Card>
      <EmptyState
        title="Nothing to remind you about yet"
        message="Add a purchase to start tracking returns and warranties."
      />
    </View>
  );
}
