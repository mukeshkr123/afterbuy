import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.surface },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        headerBackTitle: "Purchases",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: tokens.colors.canvas },
      }}
    >
      <Stack.Screen
        name="new"
        options={{
          title: "Add Purchase",
          presentation: Platform.OS === "ios" ? "modal" : "card",
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "Purchase" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Edit Purchase" }} />
      <Stack.Screen name="[id]/receipts" options={{ title: "Receipts" }} />
      <Stack.Screen name="[id]/claims" options={{ title: "Claims" }} />
      <Stack.Screen name="[id]/track" options={{ title: "Delivery" }} />
    </Stack>
  );
}
