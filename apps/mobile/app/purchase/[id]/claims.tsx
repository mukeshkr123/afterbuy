import type { Claim } from "@acme/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
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
import { EmptyState, SkeletonGroup, useAdaptiveLayout } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";

export default function PurchaseClaimsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const list = useQuery({
    queryKey: apiKeys.claims.list({ purchaseId: id ?? "" }),
    queryFn: () => listClaims(api, { purchaseId: id ?? "" }),
    enabled: Boolean(id),
  });

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["claims"] });
  }, [qc]);

  const items: Claim[] = list.data?.items ?? [];

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
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
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

              <Text style={styles.navTitle}>Claims</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New claim"
                onPress={() =>
                  router.push({
                    pathname: "/claim/new",
                    params: id ? { purchaseId: id } : {},
                  })
                }
                style={({ pressed }) => [
                  styles.newClaimButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="add" size={16} color="#5B4DF5" />
                <Text style={styles.newClaimText}>New</Text>
              </Pressable>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeaderStack}>
              <Text style={styles.sectionTitle}>Claims history</Text>
              <Text style={styles.sectionSubtitle}>
                {items.length === 0
                  ? "No active or past claims"
                  : items.length === 1
                    ? "1 claim filed"
                    : `${items.length} claims filed`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {list.isLoading ? (
              <SkeletonGroup count={3} gap={12} />
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="No claims yet"
                message="Open a return or warranty claim when something goes wrong with this purchase."
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isResolved =
            item.status === "completed" || item.status === "approved";
          const isRejected = item.status === "rejected";
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Claim ${item.type}`}
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
                <Text style={styles.claimTitle}>
                  {CLAIM_TYPE_LABEL[item.type] ?? item.type}
                </Text>
                <Text style={styles.claimSubtitle}>
                  Opened {formatDate(item.openedAt.slice(0, 10)) ?? ""}
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
