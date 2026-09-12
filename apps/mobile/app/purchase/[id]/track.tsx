import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { PurchaseDeliveryStatus } from "@acme/shared";
import { EmptyState, Skeleton, useAdaptiveLayout } from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { deliveryDisplay, formatDate } from "@/lib/purchaseDisplay";

const STAGES: ReadonlyArray<{
  status: Exclude<PurchaseDeliveryStatus, "cancelled">;
  title: string;
  description: string;
}> = [
  {
    status: "ordered",
    title: "Purchase recorded",
    description: "You recorded this purchase.",
  },
  {
    status: "shipped",
    title: "Shipped",
    description: "The merchant handed the parcel to a carrier.",
  },
  {
    status: "delivered",
    title: "Delivered",
    description: "The parcel reached you.",
  },
];

export default function TrackOrderScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const p = detail.data;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/purchase/[id]",
        params: { id: id ?? "" },
      });
  };

  if (detail.isLoading) {
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
          <Text style={styles.navTitle}>Delivery Tracking</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={{ gap: 16, marginTop: 16 }}>
          <Skeleton height={120} />
          <Skeleton height={240} />
        </View>
      </View>
    );
  }

  if (!p) {
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
          <Text style={styles.navTitle}>Delivery Tracking</Text>
          <View style={styles.navSpacer} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Purchase not available"
          message="We couldn't load this purchase. Check your connection and try again."
          action={{
            label: "Try again",
            onPress: () => void detail.refetch(),
          }}
        />
      </View>
    );
  }

  const status = deliveryDisplay(p.deliveryStatus);
  const cancelled = p.deliveryStatus === "cancelled";
  const reachedIndex = cancelled
    ? -1
    : STAGES.findIndex((s) => s.status === p.deliveryStatus);
  const orderedOn = formatDate(p.purchaseDate);

  return (
    <View style={styles.screen}>
      {/* Ambient top glow */}
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

          <Text style={styles.navTitle}>Delivery Tracking</Text>

          <View style={styles.navSpacer} />
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <PurchaseArtworkTile
              title={p.title}
              category={p.category}
              size={50}
            />

            <View style={styles.heroCopy}>
              <Text numberOfLines={1} style={styles.heroTitle}>
                {p.title}
              </Text>
              <Text numberOfLines={1} style={styles.heroSubtitle}>
                {p.merchant ? `${p.merchant} · ` : ""}
                {orderedOn ? `Purchased ${orderedOn}` : ""}
              </Text>
              {p.carrier || p.trackingNumber ? (
                <Text numberOfLines={1} style={styles.carrierInfo}>
                  {[p.carrier, p.trackingNumber].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Timeline Stepper Section */}
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeaderStack}>
            <Text style={styles.sectionTitle}>Delivery progress</Text>
            <Text style={styles.sectionSubtitle}>
              Current package status and carrier updates
            </Text>
          </View>

          <View style={styles.timelineCard}>
            {cancelled ? (
              <EmptyState
                icon="close-circle-outline"
                title="Purchase cancelled"
                message="This purchase was cancelled, so there is nothing left to track."
              />
            ) : (
              <View style={{ gap: 0 }}>
                {STAGES.map((stage, idx) => {
                  const reached = idx <= reachedIndex;
                  const isCurrent = idx === reachedIndex;
                  const isLast = idx === STAGES.length - 1;

                  return (
                    <View key={stage.status} style={styles.stepRow}>
                      <View style={styles.indicatorCol}>
                        <View
                          style={[
                            styles.dot,
                            reached && styles.dotReached,
                            isCurrent && styles.dotCurrent,
                          ]}
                        >
                          {reached ? (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color="#FFFFFF"
                            />
                          ) : null}
                        </View>
                        {!isLast ? (
                          <View
                            style={[
                              styles.connector,
                              idx < reachedIndex && styles.connectorReached,
                            ]}
                          />
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.stepContent,
                          !isLast && { paddingBottom: 28 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepTitle,
                            reached && styles.stepTitleReached,
                          ]}
                        >
                          {stage.title}
                        </Text>
                        <Text style={styles.stepDesc}>{stage.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
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
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
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
  carrierInfo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5B4DF5",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
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
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  indicatorCol: {
    alignItems: "center",
    width: 28,
    marginRight: 14,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  dotReached: {
    backgroundColor: "#16A34A",
  },
  dotCurrent: {
    backgroundColor: "#775DF5",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: "#E2E8F0",
    marginVertical: -2,
  },
  connectorReached: {
    backgroundColor: "#16A34A",
  },
  stepContent: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepTitleReached: {
    fontWeight: "700",
    color: "#0F172A",
  },
  stepDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
});
