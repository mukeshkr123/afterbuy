import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function SettingsLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.surface },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        headerBackTitle: "Settings",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: tokens.colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="lead-days" options={{ title: "Reminder Timing" }} />
      <Stack.Screen name="timezone" options={{ title: "Time Zone" }} />
      <Stack.Screen name="permissions" options={{ title: "Permissions" }} />
    </Stack>
  );
}
