import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useApi } from "@/api/ApiProvider";
import { createPurchase } from "@/api/purchases";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useTheme } from "@/theme/ThemeProvider";
import { Text, View } from "react-native";

export default function NewPurchaseScreen() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const { tokens } = useTheme();
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createPurchase>[1]) =>
      createPurchase(api, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      router.replace("/(tabs)/purchases");
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: "New purchase" }} />
      <View style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        {mutation.isError ? (
          <View style={{ padding: tokens.spacing.lg }}>
            <Text style={{ color: tokens.colors.danger }}>
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to create purchase"}
            </Text>
          </View>
        ) : null}
        <PurchaseForm
          onSubmit={(d) => mutation.mutateAsync(d)}
          submitLabel="Add purchase"
        />
      </View>
    </>
  );
}
