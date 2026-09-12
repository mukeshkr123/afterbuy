import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEnqueueMutation } from "@/offline";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Claim, ClaimStatus } from "@acme/shared";
import {
  EmptyState,
  FormError,
  Skeleton,
  useAdaptiveLayout,
} from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getClaim } from "@/api/claims";
import { getPurchase } from "@/api/purchases";
import { fromCaught, type FormErrorState } from "@/hooks/useApiError";
import {
  CLAIM_STATUS_LABEL,
  CLAIM_TYPE_LABEL,
  nextStatuses,
} from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";
import { formatMoney } from "@/components/Money";

const LIFECYCLE: ClaimStatus[] = [
  "draft",
  "submitted",
  "in_progress",
  "approved",
  "completed",
];

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusSummary(status: ClaimStatus, resolvedAt?: string | null) {
  switch (status) {
    case "draft":
      return "This claim is drafted locally and has not been submitted yet.";
    case "submitted":
      return "Your claim has been submitted and is awaiting review.";
    case "in_progress":
      return "The merchant or provider is actively working on this claim.";
    case "approved":
      return "This claim has been approved. Settlement is in progress.";
    case "completed":
      return resolvedAt
        ? `This claim was completed on ${formatDate(resolvedAt.slice(0, 10))}.`
        : "This claim was successfully completed.";
    case "rejected":
      return "This claim was rejected by the provider.";
    case "cancelled":
      return "This claim was cancelled.";
    default:
      return "Status update pending.";
  }
}

export default function ClaimDetailScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [error, setError] = useState<FormErrorState>({
    message: null,
    fields: {},
  });

  const claim = useQuery({
    queryKey: apiKeys.claims.detail(id ?? ""),
    queryFn: () => getClaim(api, id ?? ""),
    enabled: Boolean(id),
  });

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(claim.data?.purchaseId ?? ""),
    queryFn: () => getPurchase(api, claim.data?.purchaseId ?? ""),
    enabled: Boolean(claim.data?.purchaseId),
  });

  const advance = useEnqueueMutation<ClaimStatus, unknown>({
    build: (status) => ({
      method: "PATCH",
      endpoint: `/v1/claims/${id}`,
      body: { status },
      label: `Update claim status to ${status}`,
      optimisticPatch: {
        queryKey: apiKeys.claims.detail(id ?? ""),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? { ...(prev as Record<string, unknown>), status }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["claims"] }),
        qc.invalidateQueries({
          queryKey: apiKeys.claims.detail(id ?? ""),
        }),
        qc.invalidateQueries({ queryKey: ["purchases"] }),
      ]);
      setError({ message: null, fields: {} });
      claim.refetch().catch(() => {});
    },
    onError: (caught) => setError(fromCaught(caught)),
  });

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/claims");
  };

  if (claim.isLoading) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Claim Details</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={{ gap: 16, marginTop: 16 }}>
          <Skeleton height={140} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  if (!claim.data) {
    return (
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.navTitle}>Claim Details</Text>
          <View style={styles.navSpacer} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Claim not available"
          message="We couldn't load this claim. Check your connection and try again."
          action={{
            label: "Try again",
            onPress: () => void claim.refetch(),
          }}
        />
      </View>
    );
  }

  const item = claim.data;
  const p = purchase.data;
  const transitions = nextStatuses(item.status);
  const isResolved = item.status === "completed" || item.status === "approved";
  const isRejected = item.status === "rejected" || item.status === "cancelled";
  const formattedRefund =
    item.refundAmountMinor != null
      ? formatMoney(item.refundAmountMinor, p?.currency)
      : null;

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

          <Text style={styles.navTitle}>Claim Details</Text>

          <View style={styles.navSpacer} />
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            {p ? (
              <PurchaseArtworkTile
                title={p.title}
                category={p.category}
                size={50}
              />
            ) : (
              <View style={styles.defaultIconBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color="#6366F1"
                />
              </View>
            )}

            <View style={styles.heroCopy}>
              <Text style={styles.claimTypeHeading}>
                {CLAIM_TYPE_LABEL[item.type]}
              </Text>
              <Text numberOfLines={1} style={styles.heroTitle}>
                {p?.title ?? "Saved purchase"}
              </Text>
              <Text style={styles.heroSubtitle}>
                Opened{" "}
                {formatDate(item.openedAt.slice(0, 10)) ??
                  item.openedAt.slice(0, 10)}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isResolved
                  ? styles.statusResolved
                  : isRejected
                    ? styles.statusRejected
                    : styles.statusActive,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isResolved
                    ? styles.statusTextResolved
                    : isRejected
                      ? styles.statusTextRejected
                      : styles.statusTextActive,
                ]}
              >
                {CLAIM_STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
          </View>

          {p ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View purchase"
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]",
                  params: { id: item.purchaseId },
                })
              }
              style={({ pressed }) => [
                styles.viewPurchasePill,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="bag-check-outline" size={16} color="#5B4DF5" />
              <Text style={styles.viewPurchaseText}>View purchase</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Current status explanation */}
        <View style={styles.explanationCard}>
          <View style={{ gap: 4 }}>
            <Text style={styles.explanationTitle}>Status summary</Text>
            <Text style={styles.explanationBody}>
              {statusSummary(item.status, item.resolvedAt)}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Claim details</Text>
            <Text style={styles.sectionSubtitle}>
              Filed reference information and recorded amounts
            </Text>
          </View>

          <View style={styles.groupedCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconTile}>
                <Ionicons name="shield-outline" size={18} color="#6366F1" />
              </View>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {CLAIM_TYPE_LABEL[item.type]}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconTile}>
                <Ionicons name="calendar-outline" size={18} color="#6366F1" />
              </View>
              <Text style={styles.detailLabel}>Opened</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(item.openedAt) ?? "—"}
              </Text>
            </View>

            {item.resolvedAt ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconTile}>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color="#059669"
                    />
                  </View>
                  <Text style={styles.detailLabel}>Resolved</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(item.resolvedAt) ?? "—"}
                  </Text>
                </View>
              </>
            ) : null}

            {item.reference ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconTile}>
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color="#6366F1"
                    />
                  </View>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailValue}>{item.reference}</Text>
                </View>
              </>
            ) : null}

            {formattedRefund ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconTile}>
                    <Ionicons name="card-outline" size={18} color="#6366F1" />
                  </View>
                  <Text style={styles.detailLabel}>Refund amount</Text>
                  <Text style={styles.detailValue}>{formattedRefund}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {item.notes ? (
          <View style={{ gap: 8 }}>
            <View style={styles.sectionHeaderStack}>
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesBody}>{item.notes}</Text>
            </View>
          </View>
        ) : null}

        <FormError message={error.message} />

        {/* Status Transition Action Buttons */}
        {transitions.length > 0 ? (
          <View style={styles.actionGroup}>
            {transitions.map((nextStatus) => (
              <Pressable
                key={nextStatus}
                accessibilityRole="button"
                accessibilityLabel={`Advance to ${nextStatus}`}
                onPress={() => advance.mutate(nextStatus)}
                disabled={advance.isPending}
                style={({ pressed }) => [
                  styles.advanceButton,
                  {
                    opacity: advance.isPending ? 0.6 : pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <Text style={styles.advanceButtonText}>
                  {advance.isPending
                    ? "Updating..."
                    : `Mark as ${CLAIM_STATUS_LABEL[nextStatus]}`}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
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
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  defaultIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  claimTypeHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366F1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: "#FEF3C7",
  },
  statusResolved: {
    backgroundColor: "#ECFDF5",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#B45309",
  },
  statusTextResolved: {
    color: "#059669",
  },
  statusTextRejected: {
    color: "#DC2626",
  },
  viewPurchasePill: {
    backgroundColor: "#F1F5FD",
    borderRadius: 12,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  viewPurchaseText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  explanationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  explanationBody: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
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
  groupedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  detailIconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
  },
  notesBody: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  actionGroup: {
    gap: 10,
    marginTop: 8,
  },
  advanceButton: {
    height: 52,
    backgroundColor: "#775DF5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  advanceButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
