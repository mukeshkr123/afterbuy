import type { Receipt } from "@acme/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText,
  Button,
  Dialog,
  EmptyState,
  FormError,
  IconTile,
  ListItem,
  ScreenHeader,
  SkeletonGroup,
  useAdaptiveLayout,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import {
  deleteReceipt,
  uploadReceipt,
  type ReceiptUpload,
} from "@/api/receipts";
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

function receiptTitle(receipt: Receipt): string {
  const subtype = receipt.contentType.split("/")[1]?.toUpperCase();
  return subtype ? `${subtype} receipt` : "Receipt";
}

function receiptSubtitle(receipt: Receipt): string {
  const dimensions =
    receipt.width && receipt.height
      ? `${receipt.width} x ${receipt.height}`
      : null;
  return [formatBytes(receipt.sizeBytes), dimensions]
    .filter(Boolean)
    .join(" · ");
}

export default function ReceiptsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
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
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            });
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
    onError: (caught) => {
      const parsed = fromCaught(caught);
      setError(
        parsed.message ??
          (caught instanceof Error
            ? caught.message
            : "Could not attach the receipt.")
      );
    },
  });
  const removeReceipt = useMutation({
    mutationFn: (receiptId: string) => deleteReceipt(api, receiptId),
    onSuccess: () => {
      setReceiptToDelete(null);
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
    },
    onError: (caught) => {
      const parsed = fromCaught(caught);
      setError(
        parsed.message ??
          (caught instanceof Error
            ? caught.message
            : "Could not delete the receipt.")
      );
    },
  });
  const receipts: Receipt[] = detail.data?.receipts ?? [];

  return (
    <>
      <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            paddingBottom: Math.max(insets.bottom + 24, 32),
            flexGrow: receipts.length === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={detail.isRefetching}
              onRefresh={() => void detail.refetch()}
              tintColor={tokens.colors.primary}
            />
          }
          ListHeaderComponent={
            <View
              style={{
                paddingTop: Math.max(
                  insets.top + tokens.spacing.sm,
                  tokens.spacing.md
                ),
                paddingHorizontal: tokens.spacing.xl - 4,
                paddingBottom: tokens.spacing.md,
                gap: tokens.spacing.sm,
                backgroundColor: tokens.colors.canvas,
              }}
            >
              <ScreenHeader title="Receipts" />
              <AppText role="subheadline" tone="subtle">
                {receipts.length === 0
                  ? "No files attached"
                  : receipts.length === 1
                    ? "1 file attached"
                    : `${receipts.length} files attached`}
              </AppText>
              <Button
                label={capture.isPending ? "Uploading…" : "Photograph receipt"}
                disabled={capture.isPending}
                busy={capture.isPending}
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
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {detail.isLoading ? (
                <SkeletonGroup count={3} gap={tokens.spacing.sm} />
              ) : (
                <EmptyState
                  icon="document-text-outline"
                  title="No receipts yet"
                  message="Attach a receipt so you have proof of purchase when you file a claim."
                />
              )}
            </View>
          }
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                marginLeft: 76,
                backgroundColor: tokens.colors.border,
              }}
            />
          )}
          renderItem={({ item }) => (
            <ListItem
              title={receiptTitle(item)}
              subtitle={receiptSubtitle(item)}
              detail={`Added ${formatAdded(item.createdAt)}`}
              divider={false}
              leading={<IconTile icon="document-outline" tone="info" />}
              trailing={
                <Button
                  label="Delete"
                  variant="tertiary"
                  disabled={removeReceipt.isPending}
                  onPress={() => setReceiptToDelete(item)}
                />
              }
            />
          )}
        />
      </View>
      <Dialog
        visible={Boolean(receiptToDelete)}
        title="Delete this receipt?"
        description="This removes the attached receipt file from this purchase."
        primaryLabel={removeReceipt.isPending ? "Deleting..." : "Delete"}
        destructive
        onPrimary={() => {
          if (receiptToDelete) removeReceipt.mutate(receiptToDelete.id);
        }}
        secondaryLabel="Cancel"
        onDismiss={() => setReceiptToDelete(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});
