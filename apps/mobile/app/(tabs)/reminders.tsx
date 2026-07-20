import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getReminders } from "@/api/reminders";
import { useTheme } from "@/theme/ThemeProvider";

export default function RemindersScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const list = useQuery({
    queryKey: apiKeys.reminders("upcoming"),
    queryFn: () => getReminders(api, "upcoming"),
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#E5E7EB";

  // Mockup warranty items matching the design screenshot
  const mockupWarranties = [
    {
      id: "1",
      title: "iPhone 15",
      validUntil: "Valid till 05 May 2025",
      daysLeft: "364 days left",
      active: true,
      thumbImage: require("../../assets/iphone_thumb.png"),
      iconName: null,
    },
    {
      id: "2",
      title: "Sony WH-CH720N",
      validUntil: "Valid till 04 May 2025",
      daysLeft: "363 days left",
      active: true,
      thumbImage: null,
      iconName: "headset-outline" as const,
    },
    {
      id: "3",
      title: "Philips Air Fryer",
      validUntil: "Valid till 30 Apr 2026",
      daysLeft: "724 days left",
      active: true,
      thumbImage: null,
      iconName: "restaurant-outline" as const,
    },
    {
      id: "4",
      title: "Boat Airdopes 141",
      validUntil: "No active warranty",
      daysLeft: null,
      active: false,
      thumbImage: null,
      iconName: "headset-outline" as const,
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 8, 20),
          paddingBottom: Math.max(insets.bottom + 20, 28),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/(tabs)")
          }
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          My Warranties
        </Text>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/purchase/new")}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={textColor} />
        </Pressable>
      </View>

      {/* Warranties List */}
      <View style={styles.warrantiesList}>
        {mockupWarranties.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.warrantyCard,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() =>
              router.push({
                pathname: "/reminder/[id]",
                params: { id: item.id },
              })
            }
          >
            <View style={styles.cardLeft}>
              <View
                style={[styles.productThumb, { backgroundColor: "#F3F4F6" }]}
              >
                {item.thumbImage ? (
                  <Image
                    source={item.thumbImage}
                    style={styles.thumbImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={item.iconName!} size={24} color="#374151" />
                )}
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.productTitle, { color: textColor }]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.validUntilText,
                    { color: item.active ? textMuted : "#9CA3AF" },
                  ]}
                >
                  {item.validUntil}
                </Text>
                {item.daysLeft ? (
                  <Text style={styles.daysLeftText}>{item.daysLeft}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Add Product Manually Button */}
      <Pressable
        style={({ pressed }) => [
          styles.addManuallyButton,
          { borderColor, backgroundColor: cardBg },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => router.push("/purchase/new")}
      >
        <Text style={styles.addManuallyText}>Add Product Manually</Text>
      </Pressable>
    </ScrollView>
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
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  warrantiesList: {
    gap: 14,
  },
  warrantyCard: {
    padding: 16,
    borderRadius: 18,
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
  productThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  cardMeta: {
    gap: 2,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  validUntilText: {
    fontSize: 13,
  },
  daysLeftText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  addManuallyButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addManuallyText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
});
