import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Dialog } from "@/components/Dialog";
import { UndoableToast } from "@/components/UndoableToast";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { deletePurchase, getPurchase, restorePurchase } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import { useTheme } from "@/theme/ThemeProvider";

export default function PurchaseDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [undoState, setUndoState] = useState<{
    id: string;
    visible: boolean;
  } | null>(null);

  const softDelete = useMutation({
    mutationFn: () => deletePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setConfirmDelete(false);
      setUndoState({ id: id ?? "", visible: true });
    },
    onError: (e) => {
      setError(fromCaught(e));
      setConfirmDelete(false);
    },
  });

  const undoDelete = useMutation({
    mutationFn: () => restorePurchase(api, id ?? ""),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: apiKeys.purchases.detail(id ?? ""),
      });
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      setUndoState(null);
    },
    onError: (e) => setError(fromCaught(e)),
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  const p = detail.data;

  const productTitle = p?.title || "iPhone 15 (128GB)";
  const productVariant = p?.merchant ? `Blue • ${p.merchant}` : "Blue";
  const deliveryStatus = "Delivered";
  const merchantName = p?.merchant || "Amazon.in";
  const orderId = `403-4253567-1234567`;
  const orderedDate = p?.purchaseDate
    ? `Ordered on ${p.purchaseDate}`
    : "Ordered on 06 May 2024";

  const warrantyText = p?.warrantyExpiresAt
    ? `Valid till ${p.warrantyExpiresAt}`
    : "Valid till 05 May 2025";
  const returnDeadlineText = p?.returnDeadlineAt
    ? `Eligible till ${p.returnDeadlineAt}`
    : "Eligible till 20 May 2024";

  const formattedPrice =
    p?.amountMinor !== null && p?.amountMinor !== undefined
      ? (p.amountMinor / 100).toLocaleString("en-IN", {
          style: "currency",
          currency: p.currency || "INR",
          maximumFractionDigits: 0,
        })
      : "₹79,900";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Order Details
            </Text>
            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]/edit",
                  params: { id: id ?? "" },
                })
              }
              hitSlop={8}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={textColor}
              />
            </Pressable>
          </View>

          {/* Product Header Card */}
          <View style={[styles.productCard, { backgroundColor: cardBg }]}>
            <View style={styles.productLeft}>
              <View
                style={[styles.productThumb, { backgroundColor: "#F3F4F6" }]}
              >
                <Image
                  source={require("../../assets/iphone_thumb.png")}
                  style={styles.thumbImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.productMeta}>
                <Text style={[styles.productTitle, { color: textColor }]}>
                  {productTitle}
                </Text>
                <Text style={[styles.productVariant, { color: textMuted }]}>
                  {productVariant}
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{deliveryStatus}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Merchant & Order Info Card */}
          <Pressable
            style={({ pressed }) => [
              styles.infoCard,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() =>
              router.push({
                pathname: "/purchase/[id]/track",
                params: { id: id ?? "" },
              })
            }
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ gap: 6 }}>
                <Text style={[styles.merchantTitle, { color: textColor }]}>
                  {merchantName}
                </Text>
                <Text style={[styles.orderDetailText, { color: "#4B5563" }]}>
                  Order ID: <Text style={{ color: textColor }}>{orderId}</Text>
                </Text>
                <Text style={[styles.orderDetailText, { color: "#4B5563" }]}>
                  {orderedDate}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Protection Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: textColor }]}>
              Protection
            </Text>

            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              {/* Warranty Item */}
              <Pressable
                style={({ pressed }) => [
                  styles.protectionItem,
                  { borderBottomColor: borderColor, borderBottomWidth: 1 },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]/claims",
                    params: { id: id ?? "" },
                  })
                }
              >
                <View style={styles.itemLeft}>
                  <View
                    style={[styles.itemIconBox, { backgroundColor: "#F0FDF4" }]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={22}
                      color="#16A34A"
                    />
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.itemTitle, { color: textColor }]}>
                      Warranty
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: "#4B5563" }]}>
                      1 Year Manufacturer Warranty
                    </Text>
                    <Text style={[styles.itemDetail, { color: textMuted }]}>
                      {warrantyText}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>

              {/* Return Window Item */}
              <Pressable
                style={({ pressed }) => [
                  styles.protectionItem,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push("/(tabs)/reminders")}
              >
                <View style={styles.itemLeft}>
                  <View
                    style={[styles.itemIconBox, { backgroundColor: "#F5F3FF" }]}
                  >
                    <Ionicons name="sync-outline" size={22} color="#6366F1" />
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.itemTitle, { color: textColor }]}>
                      Return Window
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: "#4B5563" }]}>
                      {returnDeadlineText}
                    </Text>
                    <Text style={[styles.itemDetail, { color: textMuted }]}>
                      (7 days left)
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Bill & Documents Section */}
          <View style={styles.sectionContainer}>
            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.documentItem,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]/receipts",
                    params: { id: id ?? "" },
                  })
                }
              >
                <View>
                  <Text
                    style={[styles.sectionHeaderTitle, { color: textColor }]}
                  >
                    Bill & Documents
                  </Text>
                  <Text style={[styles.documentFileName, { color: "#4B5563" }]}>
                    {(
                      p?.receipts?.[0] as unknown as
                        { filename?: string } | undefined
                    )?.filename ?? "Invoice.pdf"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Price Details Section */}
          <View style={styles.sectionContainer}>
            <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.documentItem,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  // View full price breakdown
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text
                    style={[styles.sectionHeaderTitle, { color: textColor }]}
                  >
                    Price Details
                  </Text>
                  <Text style={[styles.priceAmount, { color: textColor }]}>
                    {formattedPrice}
                  </Text>
                  <Text
                    style={[styles.paymentMethodText, { color: "#4B5563" }]}
                  >
                    Paid via HDFC Bank •••• 1234
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Delete Action Button */}
          <Pressable
            style={styles.deleteButton}
            onPress={() => setConfirmDelete(true)}
          >
            <Text style={styles.deleteText}>Delete Order</Text>
          </Pressable>

          {/* Error Banner */}
          {error.message ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Dialog
          visible={confirmDelete}
          title="Delete this purchase?"
          description="Returns and warranties will pause. You can undo this for 5 seconds."
          primaryLabel="Delete"
          destructive
          onPrimary={() => softDelete.mutate()}
          secondaryLabel="Cancel"
          onDismiss={() => setConfirmDelete(false)}
        />

        <UndoableToast
          message={undoState?.visible ? "Purchase deleted" : null}
          actionLabel="Undo"
          onAction={() => undoDelete.mutate()}
          onDismiss={() => setUndoState(null)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editButton: {
    width: 38,
    height: 38,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  productCard: {
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  productThumb: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  productMeta: {
    flex: 1,
    gap: 3,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  productVariant: {
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  merchantTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderDetailText: {
    fontSize: 14,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  groupCard: {
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  protectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: {
    gap: 2,
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemSubtitle: {
    fontSize: 13,
  },
  itemDetail: {
    fontSize: 13,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  documentFileName: {
    fontSize: 14,
    marginTop: 4,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  paymentMethodText: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
});
