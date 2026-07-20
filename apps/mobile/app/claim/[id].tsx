import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
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
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getClaim } from "@/api/claims";
import { useTheme } from "@/theme/ThemeProvider";

export default function ClaimDetailScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const claim = useQuery({
    queryKey: apiKeys.claims.detail(id ?? ""),
    queryFn: () => getClaim(api, id ?? ""),
    enabled: Boolean(id),
  });

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#E5E7EB";

  const claimSteps = [
    {
      id: "1",
      title: "Submitted",
      time: "Today, 10:30 AM",
      status: "completed",
    },
    { id: "2", title: "Under Review", time: "In progress", status: "active" },
    { id: "3", title: "Approved", time: "Pending", status: "pending" },
    { id: "4", title: "Resolved", time: "Pending", status: "pending" },
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
              Claim Details
            </Text>

            <View style={{ width: 38 }} />
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
                  iPhone 15 (128GB)
                </Text>
                <Text style={[styles.claimIdText, { color: textMuted }]}>
                  Claim ID: CLM-894125
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Under Review</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Claim Timeline Card */}
          <View style={[styles.timelineCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Claim Status
            </Text>

            <View style={styles.timelineList}>
              {claimSteps.map((step, idx) => {
                const isLast = idx === claimSteps.length - 1;
                const isDone = step.status === "completed";
                const isActive = step.status === "active";

                return (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.indicatorCol}>
                      <View
                        style={[
                          styles.dotCircle,
                          isDone && styles.dotCompleted,
                          isActive && styles.dotActive,
                        ]}
                      >
                        {isDone ? (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#FFFFFF"
                          />
                        ) : (
                          <View
                            style={[
                              styles.dotInner,
                              isActive && { backgroundColor: "#4F46E5" },
                            ]}
                          />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.lineConnector,
                            isDone && { backgroundColor: "#16A34A" },
                          ]}
                        />
                      )}
                    </View>

                    <View
                      style={[
                        styles.stepContent,
                        !isLast && { paddingBottom: 20 },
                      ]}
                    >
                      <Text style={[styles.stepTitle, { color: textColor }]}>
                        {step.title}
                      </Text>
                      <Text style={[styles.stepTime, { color: textMuted }]}>
                        {step.time}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Details Metadata Card */}
          <View style={[styles.metaCard, { backgroundColor: cardBg }]}>
            <View
              style={[
                styles.metaRow,
                { borderBottomColor: borderColor, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.metaLabel, { color: textMuted }]}>
                Claim Type
              </Text>
              <Text style={[styles.metaValue, { color: textColor }]}>
                Warranty Claim
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: textMuted }]}>
                Requested Resolution
              </Text>
              <Text style={[styles.metaValue, { color: textColor }]}>
                Replacement
              </Text>
            </View>
          </View>

          {/* Support Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.supportButton,
              { borderColor },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#4F46E5"
            />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </Pressable>
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
    gap: 14,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  productMeta: {
    gap: 3,
  },
  productTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  claimIdText: {
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusBadgeText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
  },
  timelineCard: {
    padding: 20,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  timelineList: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
  },
  indicatorCol: {
    alignItems: "center",
    width: 20,
  },
  dotCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    zIndex: 2,
  },
  dotCompleted: {
    backgroundColor: "#16A34A",
  },
  dotActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  lineConnector: {
    width: 2,
    backgroundColor: "#E2E8F0",
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  stepTime: {
    fontSize: 13,
  },
  metaCard: {
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  metaLabel: {
    fontSize: 14,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  supportButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    marginTop: 6,
  },
  supportButtonText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
});
