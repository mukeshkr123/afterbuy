import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getPurchase } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";

export default function TrackOrderScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";

  const p = detail.data;
  const merchantName = p?.merchant || "Amazon.in";
  const orderId = "403-4253567-1234567";

  const trackingSteps = [
    {
      id: "1",
      title: "Delivered",
      timestamp: "10 May, 11:30 AM",
      description: "Package delivered to Rohan Verma",
      completed: true,
    },
    {
      id: "2",
      title: "Out for Delivery",
      timestamp: "10 May, 8:45 AM",
      completed: true,
    },
    {
      id: "3",
      title: "Arrived at Delivery Station",
      timestamp: "10 May, 6:20 AM",
      completed: true,
    },
    {
      id: "4",
      title: "Shipped",
      timestamp: "09 May, 9:10 PM",
      completed: true,
    },
    {
      id: "5",
      title: "Order Placed",
      timestamp: "06 May, 10:15 AM",
      completed: true,
    },
  ];

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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: textColor }]}>
              Track Order
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Merchant Header Card */}
          <View style={[styles.merchantCard, { backgroundColor: cardBg }]}>
            <View style={styles.merchantLeft}>
              <View
                style={[styles.merchantLogoBox, { backgroundColor: "#F3F4F6" }]}
              >
                <Image
                  source={require("../../../assets/amazon_logo.png")}
                  style={styles.merchantLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.merchantMeta}>
                <Text style={[styles.merchantName, { color: textColor }]}>
                  {merchantName}
                </Text>
                <Text style={[styles.orderIdText, { color: textMuted }]}>
                  Order ID: <Text style={{ color: textColor }}>{orderId}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Timeline Card */}
          <View style={[styles.timelineCard, { backgroundColor: cardBg }]}>
            <View style={styles.timelineList}>
              {trackingSteps.map((step, idx) => {
                const isLast = idx === trackingSteps.length - 1;
                return (
                  <View key={step.id} style={styles.stepItemContainer}>
                    {/* Left Timeline Line & Dot Node */}
                    <View style={styles.indicatorCol}>
                      <View style={styles.dotCircle}>
                        <View style={styles.dotInner} />
                      </View>
                      {!isLast && <View style={styles.lineConnector} />}
                    </View>

                    {/* Step Content */}
                    <View
                      style={[
                        styles.stepContent,
                        !isLast && { paddingBottom: 22 },
                      ]}
                    >
                      <Text style={[styles.stepTitle, { color: textColor }]}>
                        {step.title}
                      </Text>
                      <Text
                        style={[styles.stepTimestamp, { color: textMuted }]}
                      >
                        {step.timestamp}
                      </Text>
                      {step.description ? (
                        <Text
                          style={[styles.stepDescription, { color: textMuted }]}
                        >
                          {step.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* View on Amazon Button */}
            <View style={styles.cardFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.amazonButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() =>
                  Linking.openURL("https://www.amazon.in").catch(() => {})
                }
              >
                <Text style={styles.amazonButtonText}>View on Amazon</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
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
  merchantCard: {
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  merchantLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  merchantLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  merchantLogo: {
    width: "100%",
    height: "100%",
  },
  merchantMeta: {
    gap: 2,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderIdText: {
    fontSize: 14,
  },
  timelineCard: {
    padding: 20,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineList: {
    marginBottom: 4,
  },
  stepItemContainer: {
    flexDirection: "row",
    gap: 16,
  },
  indicatorCol: {
    alignItems: "center",
    width: 20,
  },
  dotCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    zIndex: 2,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  lineConnector: {
    width: 2.5,
    backgroundColor: "#16A34A",
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  stepContent: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  stepTimestamp: {
    fontSize: 13,
  },
  stepDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  amazonButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  amazonButtonText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
});
