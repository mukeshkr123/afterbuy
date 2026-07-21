import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Button,
  EmptyState,
  FormError,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SkeletonGroup,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { uploadReceipt, type ReceiptUpload } from "@/api/receipts";
import { fromCaught } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAdded(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReceiptsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const capture = useMutation({
    mutationFn: async (source: "camera" | "library") => {
      setError(null);
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          source === "camera"
            ? "Camera access is off. Enable it in Settings to photograph a receipt."
            : "Photo access is off. Enable it in Settings to attach a receipt."
        );
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.7,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset) return null;
      const file: ReceiptUpload = {
        uri: asset.uri,
        contentType: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
      };
      return uploadReceipt(api, id ?? "", file);
    },
    onSuccess: (receipt) => {
      if (receipt) {
        void qc.invalidateQueries({
          queryKey: apiKeys.purchases.detail(id ?? ""),
        });
      }
    },
    onError: (e) => {
      const parsed = fromCaught(e);
      setError(
        parsed.message ??
          (e instanceof Error ? e.message : "Could not attach the receipt.")
      );
    },
  });

  const receipts = detail.data?.receipts ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Bill & Documents" />

        <SectionCard title="Add a receipt">
          <View style={{ gap: tokens.spacing.md }}>
            <Button
              label={capture.isPending ? "Uploading…" : "Photograph receipt"}
              disabled={capture.isPending}
              onPress={() => capture.mutate("camera")}
            />
            <Button
              label="Choose from library"
              variant="secondary"
              disabled={capture.isPending}
              onPress={() => capture.mutate("library")}
            />
            <FormError message={error} />
          </View>
        </SectionCard>

        {detail.isLoading ? (
          <SkeletonGroup count={3} gap={tokens.spacing.md} />
        ) : receipts.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon="document-text-outline"
              title="No receipts yet"
              message="Attach the bill so you have proof of purchase when you file a claim."
            />
          </SectionCard>
        ) : (
          <SectionCard flush>
            {receipts.map((r, idx) => (
              <ListItem
                key={r.id}
                // The API stores no filename — show the facts it does return
                // instead of the "Invoice.pdf" this screen used to display.
                title={r.contentType.split("/")[1]?.toUpperCase() ?? "Receipt"}
                subtitle={formatBytes(r.sizeBytes)}
                detail={`Added ${formatAdded(r.createdAt)}`}
                divider={idx < receipts.length - 1}
                leading={<IconTile icon="document-outline" tone="info" />}
              />
            ))}
          </SectionCard>
        )}
      </ScreenScroll>
    </>
  );
}
