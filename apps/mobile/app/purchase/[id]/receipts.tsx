import type { Receipt } from "@acme/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Dialog,
  EmptyState,
  FormError,
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
  const router = useRouter();
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

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/purchase/[id]",
        params: { id: id ?? "" },
      });
  };

  return (
    <View style={styles.screen}>
      {/* Top ambient glow */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 36, 44),
          gap: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detail.isRefetching}
            onRefresh={() => void detail.refetch()}
            tintColor="#5B4DF5"
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            {/* Navigation Bar */}
            <View style={styles.navBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.backButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </Pressable>

              <Text style={styles.navTitle}>Receipts</Text>

              <View style={styles.navSpacer} />
            </View>

            {/* Upload Action Card */}
            <View style={styles.uploadCard}>
              <View style={{ gap: 4 }}>
                <Text style={styles.uploadCardTitle}>Add a receipt</Text>
                <Text style={styles.uploadCardSubtitle}>
                  Keep proof of purchase attached to this record.
                </Text>
              </View>

              <View style={styles.pickButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Photograph receipt"
                  onPress={() => capture.mutate("camera")}
                  disabled={capture.isPending}
                  style={({ pressed }) => [
                    styles.pickButton,
                    { opacity: capture.isPending ? 0.5 : pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.pickIconBox}>
                    <Ionicons name="camera-outline" size={22} color="#6366F1" />
                  </View>
                  <Text style={styles.pickButtonText}>Take photo</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose from library"
                  onPress={() => capture.mutate("library")}
                  disabled={capture.isPending}
                  style={({ pressed }) => [
                    styles.pickButton,
                    { opacity: capture.isPending ? 0.5 : pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.pickIconBox}>
                    <Ionicons name="image-outline" size={22} color="#6366F1" />
                  </View>
                  <Text style={styles.pickButtonText}>Choose photo</Text>
                </Pressable>
              </View>
            </View>

            <FormError message={error} />

            {/* Section Header */}
            <View style={styles.sectionHeaderStack}>
              <Text style={styles.sectionTitle}>Attached receipts</Text>
              <Text style={styles.sectionSubtitle}>
                {receipts.length === 0
                  ? "0 files attached"
                  : receipts.length === 1
                    ? "1 file attached"
                    : `${receipts.length} files attached`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {detail.isLoading ? (
              <SkeletonGroup count={3} gap={12} />
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="No receipts yet"
                message="Attach a receipt so you have proof of purchase when you file a claim."
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.receiptItemCard}>
            <View style={styles.receiptIconTile}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#6366F1"
              />
            </View>

            <View style={styles.receiptCopy}>
              <Text numberOfLines={1} style={styles.receiptName}>
                {receiptTitle(item)}
              </Text>
              <Text numberOfLines={1} style={styles.receiptMeta}>
                {receiptSubtitle(item)} · Added {formatAdded(item.createdAt)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${receiptTitle(item)}`}
              onPress={() => setReceiptToDelete(item)}
              style={({ pressed }) => [
                styles.deleteIconButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </Pressable>
          </View>
        )}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  ambientGlowTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSpacer: {
    width: 42,
  },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    gap: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  uploadCardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  pickButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickButton: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    textAlign: "center",
  },
  sectionHeaderStack: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  receiptItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  receiptIconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  receiptCopy: {
    flex: 1,
    gap: 2,
  },
  receiptName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  receiptMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
