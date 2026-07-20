import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { listPurchases } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 5 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 5 }),
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const accentColor = tokens.colors.accent ?? "#4F46E5";

  const firstName =
    me.data?.email?.split("@")[0]?.replace(/^\w/, (c) => c.toUpperCase()) ??
    "Rohan";

  const items = recent.data?.items ?? [];

  // Fallback mockup orders matching the design screenshot if user has no purchases yet
  const displayOrders =
    items.length > 0
      ? items.map((item) => ({
          id: item.id,
          title: item.title,
          date: `Delivered on ${item.purchaseDate ?? "10 May"}`,
          status: "Delivered",
          iconName: "hardware-chip-outline" as const,
        }))
      : [
          {
            id: "1",
            title: "iPhone 15",
            date: "Delivered on 10 May",
            status: "Delivered",
            iconName: "phone-portrait-outline" as const,
          },
          {
            id: "2",
            title: "Boat Airdopes 141",
            date: "Delivered on 08 May",
            status: "Delivered",
            iconName: "headset-outline" as const,
          },
          {
            id: "3",
            title: "Sony WH-CH720N",
            date: "Delivered on 05 May",
            status: "Delivered",
            iconName: "headset-outline" as const,
          },
        ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 12, 24),
          paddingBottom: Math.max(insets.bottom + 20, 28),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: textColor }]}>
            Hello, {firstName}
          </Text>
          <Text style={[styles.subGreeting, { color: textMuted }]}>
            Here's your overview
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push("/(tabs)/reminders")}
            hitSlop={8}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={textColor}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push("/purchase/new")}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color={textColor} />
          </Pressable>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        {/* Upcoming Reminders Card */}
        <Pressable
          style={({ pressed }) => [
            styles.summaryCard,
            { backgroundColor: cardBg },
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => router.push("/(tabs)/reminders")}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="alarm-outline" size={22} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Upcoming Reminders
              </Text>
              <Text style={[styles.cardSubtitle, { color: textMuted }]}>
                2 due this week
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        {/* Active Warranties Card */}
        <Pressable
          style={({ pressed }) => [
            styles.summaryCard,
            { backgroundColor: cardBg },
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => router.push("/(tabs)/purchases")}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#16A34A"
              />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Active Warranties
              </Text>
              <Text style={[styles.cardSubtitle, { color: textMuted }]}>
                4 products covered
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Recent Orders Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Recent Orders
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/purchases")}>
            <Text style={[styles.viewAllText, { color: accentColor }]}>
              View All
            </Text>
          </Pressable>
        </View>

        <View style={styles.ordersList}>
          {displayOrders.map((order) => (
            <Pressable
              key={order.id}
              style={({ pressed }) => [
                styles.orderCard,
                { backgroundColor: cardBg },
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/purchase/[id]",
                  params: { id: order.id },
                })
              }
            >
              <View style={styles.orderLeft}>
                <View
                  style={[styles.productThumb, { backgroundColor: "#F3F4F6" }]}
                >
                  <Ionicons name={order.iconName} size={24} color="#4B5563" />
                </View>
                <View style={styles.orderMeta}>
                  <Text style={[styles.orderTitle, { color: textColor }]}>
                    {order.title}
                  </Text>
                  <Text style={[styles.orderDate, { color: textMuted }]}>
                    {order.date}
                  </Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Quick Actions
        </Text>

        <View style={styles.actionsGrid}>
          {/* Scan Bill */}
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => router.push("/purchase/new")}
          >
            <View
              style={[styles.actionIconBox, { backgroundColor: "#EEF2FF" }]}
            >
              <Ionicons name="scan-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={[styles.actionLabel, { color: textColor }]}>
              Scan Bill
            </Text>
          </Pressable>

          {/* Add Order */}
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => router.push("/purchase/new")}
          >
            <View
              style={[styles.actionIconBox, { backgroundColor: "#F5F3FF" }]}
            >
              <Ionicons name="add-circle-outline" size={22} color="#6366F1" />
            </View>
            <Text style={[styles.actionLabel, { color: textColor }]}>
              Add Order
            </Text>
          </Pressable>

          {/* My Claims */}
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => router.push("/claim/new")}
          >
            <View
              style={[styles.actionIconBox, { backgroundColor: "#EEF2FF" }]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#4F46E5"
              />
            </View>
            <Text style={[styles.actionLabel, { color: textColor }]}>
              My Claims
            </Text>
          </Pressable>

          {/* Help */}
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <View
              style={[styles.actionIconBox, { backgroundColor: "#EFF6FF" }]}
            >
              <Ionicons name="help-circle-outline" size={22} color="#2563EB" />
            </View>
            <Text style={[styles.actionLabel, { color: textColor }]}>Help</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subGreeting: {
    fontSize: 15,
    marginTop: 2,
    fontWeight: "400",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryContainer: {
    gap: 14,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionContainer: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderMeta: {
    gap: 2,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderDate: {
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
