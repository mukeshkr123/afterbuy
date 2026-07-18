import { Tabs } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const { tokens } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
        },
        headerStyle: {
          backgroundColor: tokens.colors.surface,
        },
        headerTintColor: tokens.colors.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="purchases" options={{ title: "Purchases" }} />
      <Tabs.Screen name="reminders" options={{ title: "Reminders" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
