import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, EmptyState, FormError, ListItem } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { useState } from "react";

interface ReceiptLike {
  id: string;
  filename?: string;
}

export default function ReceiptsScreen() {
  const api = useApi();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });
  const [captureState, setCaptureState] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: "Receipts" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.colors.bg }}
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        <Card title="Capture">
          <Text style={{ color: tokens.colors.textMuted }}>
            Phase 6.4 wires the upload button. The photo picker integration
            (expo-image-picker) is deferred — it requires an Expo prebuild
            round-trip that breaks CI.
          </Text>
          <FormError message={captureState} />
          <Button
            label="Capture receipt"
            onPress={() => {
              // TODO(phase6.4): replace with expo-image-picker flow:
              //   const result = await ImagePicker.launchCameraAsync(...);
              //   await uploadReceipt(api, id, { uri, name, type });
              setCaptureState("Photo picker not enabled yet.");
            }}
          />
        </Card>
        <Card title="Existing receipts">
          {(detail.data?.receipts ?? []).length === 0 ? (
            <EmptyState title="No receipts yet" />
          ) : (
            <View style={{ gap: tokens.spacing.sm }}>
              {(detail.data?.receipts as ReceiptLike[] | undefined)?.map(
                (r) => (
                  <ListItem
                    key={r.id}
                    title={r.filename ?? "Receipt"}
                    subtitle="Tap to view"
                  />
                )
              )}
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  );
}
