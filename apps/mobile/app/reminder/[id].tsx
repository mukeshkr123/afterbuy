import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export default function ReminderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [remind30, setRemind30] = useState(true);
  const [remind7, setRemind7] = useState(true);
  const [claimed, setClaimed] = useState(false);

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  const productName = id === "1" ? "iPhone 15" : "Sony WH-CH720N";
  const daysLeft = id === "1" ? 364 : 363;
  const expiryDate = id === "1" ? "05 May 2025" : "04 May 2025";

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
              Reminder Detail
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Status Tag & Product Name */}
          <View style={styles.productBanner}>
            <Text style={styles.statusTagText}>Warranty Expiring Soon</Text>
            <Text style={[styles.productTitleText, { color: textColor }]}>
              {productName}
            </Text>
          </View>

          {/* Circular Countdown Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.circularRing}>
              <Text style={styles.gaugeNumberText}>{daysLeft}</Text>
              <Text style={[styles.gaugeLabelText, { color: textMuted }]}>
                days left
              </Text>
            </View>

            <View style={styles.expiryInfoBox}>
              <Text style={[styles.expiryLabelText, { color: textMuted }]}>
                Warranty Ends On
              </Text>
              <Text style={[styles.expiryDateText, { color: textColor }]}>
                {expiryDate}
              </Text>
            </View>
          </View>

          {/* Notification Toggles Card */}
          <View style={[styles.togglesCard, { backgroundColor: cardBg }]}>
            <View
              style={[
                styles.toggleRow,
                { borderBottomColor: borderColor, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.toggleLabel, { color: textColor }]}>
                Remind me 30 days before
              </Text>
              <Switch
                value={remind30}
                onValueChange={setRemind30}
                trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: textColor }]}>
                Remind me 7 days before
              </Text>
              <Switch
                value={remind7}
                onValueChange={setRemind7}
                trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* How to Claim Warranty Section */}
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionsTitle, { color: textColor }]}>
              How to Claim Warranty
            </Text>
            <Pressable onPress={() => router.push("/claim/new")}>
              <Text style={styles.viewInstructionsText}>View Instructions</Text>
            </Pressable>
          </View>

          {/* Mark as Claimed Action */}
          <Pressable
            style={styles.markClaimedButton}
            onPress={() => setClaimed(!claimed)}
          >
            <Text style={styles.markClaimedText}>
              {claimed ? "Marked as Claimed ✓" : "Mark as Used / Claimed"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 22,
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
  productBanner: {
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusTagText: {
    color: "#F59E0B",
    fontSize: 15,
    fontWeight: "700",
  },
  productTitleText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  gaugeContainer: {
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  circularRing: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 6,
    borderColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  gaugeNumberText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: -1,
  },
  gaugeLabelText: {
    fontSize: 13,
    marginTop: -2,
  },
  expiryInfoBox: {
    alignItems: "center",
    gap: 2,
  },
  expiryLabelText: {
    fontSize: 13,
  },
  expiryDateText: {
    fontSize: 16,
    fontWeight: "700",
  },
  togglesCard: {
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  instructionsContainer: {
    gap: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewInstructionsText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  markClaimedButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  markClaimedText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
});
