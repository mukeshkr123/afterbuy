import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseLayout() {
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
