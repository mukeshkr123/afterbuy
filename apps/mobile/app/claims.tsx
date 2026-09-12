import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Claim, ClaimStatus, PurchaseListResponse } from "@acme/shared";
import { EmptyState, SkeletonGroup, useAdaptiveLayout } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { listPurchases } from "@/api/purchases";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";

const CLAIM_SEGMENTS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
] as const;

type ClaimSegment = (typeof CLAIM_SEGMENTS)[number]["key"];

const ACTIVE_STATUSES = new Set<ClaimStatus>([
  "draft",
  "submitted",
  "in_progress",
]);
const RESOLVED_STATUSES = new Set<ClaimStatus>(["approved", "completed"]);
const CLOSED_STATUSES = new Set<ClaimStatus>(["rejected", "cancelled"]);

function matchesSegment(segment: ClaimSegment, status: ClaimStatus) {
  if (segment === "active") return ACTIVE_STATUSES.has(status);
  if (segment === "resolved") return RESOLVED_STATUSES.has(status);
  if (segment === "closed") return CLOSED_STATUSES.has(status);
  return true;
}

export default function GlobalClaimsScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const [segment, setSegment] = useState<ClaimSegment>("all");

  const claims = useQuery({
    queryKey: apiKeys.claims.list({}),
    queryFn: () => listClaims(api),
  });
  const purchases = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 50 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 50 }),
  });

  const purchaseItems = (purchases.data?.items ??
    []) as PurchaseListResponse["items"];
  const titleForPurchase = useMemo(
    () =>
      new Map(
        purchaseItems.map((purchase) => [purchase.id, purchase.title] as const)
      ),
    [purchaseItems]
  );
  const allItems: Claim[] = claims.data?.items ?? [];
  const items = useMemo(
    () => allItems.filter((item) => matchesSegment(segment, item.status)),
    [allItems, segment]
  );

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };

  return (
    <View style={styles.screen}>
      {/* Ambient top glow */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />

      <FlatList
        data={items}
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
            refreshing={claims.isRefetching}
            onRefresh={() => void claims.refetch()}
            tintColor="#5B4DF5"
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
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

              <Text style={styles.navTitle}>Claims</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New claim"
                onPress={() => router.push("/claim/new")}
                style={({ pressed }) => [
                  styles.newClaimButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="add" size={16} color="#5B4DF5" />
                <Text style={styles.newClaimText}>New</Text>
              </Pressable>
            </View>

            {/* Filter Pills */}
            <View style={styles.segmentRow}>
              {CLAIM_SEGMENTS.map((s) => {
                const selected = segment === s.key;
                return (
                  <Pressable
                    key={s.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSegment(s.key)}
                    style={({ pressed }) => [
                      styles.segmentPill,
                      selected && styles.segmentPillActive,
                      { opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected && styles.segmentTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {claims.isLoading ? (
              <SkeletonGroup count={3} gap={12} />
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="No claims found"
                message={
                  segment === "all"
                    ? "When something goes wrong, start a claim from a saved purchase."
                    : `No ${segment} claims found.`
                }
                action={{
                  label: "Start a claim",
                  onPress: () => router.push("/claim/new"),
                }}
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const purchaseTitle =
            titleForPurchase.get(item.purchaseId) ?? "Saved purchase";
          const isResolved =
            item.status === "completed" || item.status === "approved";
          const isRejected =
            item.status === "rejected" || item.status === "cancelled";

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Claim for ${purchaseTitle}`}
              onPress={() =>
                router.push({
                  pathname: "/claim/[id]",
                  params: { id: item.id },
                })
              }
              style={({ pressed }) => [
                styles.claimCard,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.claimIconTile}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#6366F1"
                />
              </View>

              <View style={styles.claimCopy}>
                <Text numberOfLines={1} style={styles.claimTitle}>
                  {purchaseTitle}
                </Text>
                <Text numberOfLines={1} style={styles.claimSubtitle}>
                  {CLAIM_TYPE_LABEL[item.type]} · Opened{" "}
                  {formatDate(item.openedAt.slice(0, 10)) ?? ""}
                  {item.reference ? ` · Ref ${item.reference}` : ""}
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

              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          );
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
  newClaimButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  newClaimText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentPill: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  claimCard: {
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
  claimIconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  claimCopy: {
    flex: 1,
    gap: 2,
  },
  claimTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  claimSubtitle: {
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
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
