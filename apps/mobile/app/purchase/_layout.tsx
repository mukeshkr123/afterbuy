import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.surface },
        headerTintColor: tokens.colors.text,
        contentStyle: { backgroundColor: tokens.colors.bg },
      }}
    />
  );
}
