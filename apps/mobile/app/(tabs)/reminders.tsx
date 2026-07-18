import { Text, View } from "react-native";
import { EmptyState, StatusPill } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function RemindersScreen() {
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
        Reminders
      </Text>
      <EmptyState
        title="No reminders yet"
        message="Reminders are derived from purchase dates. They'll appear here once you add a purchase."
      />
      <View style={{ alignItems: "flex-start" }}>
        <StatusPill label="Phase 5 placeholder" tone="neutral" />
      </View>
    </View>
  );
}
