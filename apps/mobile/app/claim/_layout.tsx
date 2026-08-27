import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function ClaimLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.surface },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        headerBackTitle: "Claims",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: tokens.colors.canvas },
      }}
    >
      <Stack.Screen name="new" options={{ title: "File a Claim" }} />
      <Stack.Screen name="[id]" options={{ title: "Claim" }} />
    </Stack>
  );
}
