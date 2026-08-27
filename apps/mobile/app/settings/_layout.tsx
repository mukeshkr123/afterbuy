import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function SettingsLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.canvas },
      }}
    />
  );
}
