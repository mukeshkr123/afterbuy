import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEnqueueMutation } from "@/offline";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Dialog,
  EmptyState,
  FormError,
  Skeleton,
  UndoableToast,
  useAdaptiveLayout,
} from "@/components";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase, patchPurchase } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";

export default function EditPurchaseScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const p = detail.data;

  const mutation = useEnqueueMutation<Parameters<typeof patchPurchase>[2], any>(
    {
      build: (data) => ({
        method: "PATCH",
        endpoint: `/v1/purchases/${id}`,
        body: data,
        label: `Update purchase "${p?.title || id}"`,
        optimisticPatch: {
          queryKey: apiKeys.purchases.detail(id ?? ""),
          updater: (prev) =>
            prev && typeof prev === "object"
              ? { ...(prev as Record<string, unknown>), ...data }
              : prev,
          rollback: () => undefined,
        },
      }),
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: apiKeys.purchases.detail(id ?? ""),
        });
        void qc.invalidateQueries({ queryKey: ["purchases"] });
        if (router.canGoBack()) router.back();
        else
          router.replace({
            pathname: "/purchase/[id]",
            params: { id: id ?? "" },
          });
      },
    }
  );

  const deleteMutation = useEnqueueMutation<void, unknown>({
    build: () => ({
      method: "DELETE",
      endpoint: `/v1/purchases/${id}`,
      body: null,
      label: `Delete purchase "${p?.title || id}"`,
      optimisticPatch: {
        queryKey: apiKeys.purchases.detail(id ?? ""),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? {
                ...(prev as Record<string, unknown>),
                deletedAt: new Date().toISOString(),
              }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setDeleted(true);
    },
    onError: (caught) => {
      setError(fromCaught(caught));
      setConfirmDelete(false);
    },
  });

  const undoDelete = useEnqueueMutation<void, unknown>({
    build: () => ({
      method: "POST",
      endpoint: `/v1/purchases/${id}/restore`,
      body: null,
      label: `Restore purchase "${p?.title || id}"`,
      optimisticPatch: {
        queryKey: apiKeys.purchases.detail(id ?? ""),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? { ...(prev as Record<string, unknown>), deletedAt: null }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setDeleted(false);
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 36, 44),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
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

          <Text style={styles.navTitle}>Edit Purchase</Text>

          <View style={styles.navSpacer} />
        </View>

        {detail.isLoading ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        ) : !p ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Purchase not available"
            message="We couldn't load this purchase. Check your connection and try again."
            action={{
              label: "Try again",
              onPress: () => void detail.refetch(),
            }}
          />
        ) : (
          <View style={{ gap: 20 }}>
            <PurchaseForm
              embedded
              initial={{
                title: p.title,
                merchant: p.merchant ?? undefined,
                category: p.category,
                purchaseDate: p.purchaseDate,
                amountMinor: p.amountMinor ?? undefined,
                currency: p.currency,
                notes: p.notes ?? undefined,
                deliveryStatus: p.deliveryStatus,
                trackingNumber: p.trackingNumber ?? undefined,
                carrier: p.carrier ?? undefined,
                warrantyExpiresAt: p.warrantyExpiresAt ?? undefined,
                returnDeadlineAt: p.returnDeadlineAt ?? undefined,
              }}
              onSubmit={(d) => mutation.mutateAsync(d)}
              submitLabel="Save changes"
            />

            <FormError message={error.message} />

            {/* Danger delete card */}
            <View style={styles.deleteCard}>
              <View style={styles.deleteTopRow}>
                <View style={styles.deleteIconTile}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.deleteTitle}>Delete purchase</Text>
                  <Text style={styles.deleteSubtitle}>
                    This removes the purchase from your active list. You can
                    restore it from undo flows where available.
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete purchase"
                onPress={() => setConfirmDelete(true)}
                disabled={deleteMutation.isPending}
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    opacity: deleteMutation.isPending
                      ? 0.6
                      : pressed
                        ? 0.88
                        : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {deleteMutation.isPending ? "Deleting..." : "Delete purchase"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <Dialog
        visible={confirmDelete}
        title="Delete this purchase?"
        description="This removes the purchase from your active list. You can restore it from undo flows where available."
        primaryLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        onPrimary={() => deleteMutation.mutate()}
        secondaryLabel="Cancel"
        onDismiss={() => setConfirmDelete(false)}
      />

      <UndoableToast
        message={deleted ? "Purchase deleted" : null}
        actionLabel="Undo"
        onAction={() => undoDelete.mutate()}
        onDismiss={() => {
          setDeleted(false);
          router.replace("/(tabs)/purchases");
        }}
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
    marginBottom: 4,
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
  deleteCard: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
  },
  deleteTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  deleteIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  deleteSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginTop: 2,
  },
  deleteButton: {
    height: 48,
    backgroundColor: "#DC2626",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
