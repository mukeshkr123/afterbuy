import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface WelcomeHeroIllustrationProps {
  compact?: boolean;
}

export function WelcomeHeroIllustration({
  compact = false,
}: WelcomeHeroIllustrationProps) {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Background Soft Glow */}
      <Image
        source={require("../../../assets/welcome_bg_glow.png")}
        style={styles.bgGlow}
        resizeMode="contain"
      />

      {/* Floating Badge 1: Top-Left (Receipt) */}
      <View style={[styles.floatingBadge, styles.badgeReceipt]}>
        <Image
          source={require("../../../assets/receipt_badge_icon.png")}
          style={styles.receiptIcon}
          resizeMode="contain"
        />
      </View>

      {/* Floating Badge 2: Bottom-Left (Shield) */}
      <View style={[styles.floatingBadge, styles.badgeShield]}>
        <Ionicons name="shield-checkmark-outline" size={32} color="#16A34A" />
      </View>

      {/* Floating Badge 3: Middle-Right (Notification Bell) */}
      <View style={[styles.floatingBadge, styles.badgeBell]}>
        <Ionicons name="notifications-outline" size={32} color="#D97706" />
      </View>

      {/* Main Clockwise-Tilted Purchase Card */}
      <View style={styles.mainCard}>
        {/* Top-Right Celebration Rays attached directly to the corner above $129.99 */}
        <View style={styles.raysCornerContainer} pointerEvents="none">
          <View style={[styles.ray, styles.ray1]} />
          <View style={[styles.ray, styles.ray2]} />
          <View style={[styles.ray, styles.ray3]} />
        </View>

        {/* Store Header Row */}
        <View style={styles.storeRow}>
          <View style={styles.storeIconBox}>
            <Ionicons name="bag-handle-outline" size={18} color="#6366F1" />
          </View>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>Amazon</Text>
            <Text style={styles.storeDate}>Oct 12, 2024</Text>
          </View>
          <Text style={styles.storePrice}>$129.99</Text>
        </View>

        {/* Product Preview Row */}
        <View style={styles.productRow}>
          <View style={styles.productImageBox}>
            <Image
              source={require("../../../assets/airpods_pro.png")}
              style={styles.productImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>AirPods Pro</Text>
            <Text style={styles.productCategory}>Electronics</Text>
            <View style={styles.warrantyPill}>
              <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
              <Text style={styles.warrantyPillText}>Warranty active</Text>
            </View>
          </View>
        </View>

        {/* Action Item 1: Receipt saved */}
        <View style={styles.actionRow}>
          <Ionicons
            name="document-text-outline"
            size={15}
            color="#374151"
            style={styles.actionIcon}
          />
          <Text style={styles.actionLabelFull}>Receipt saved</Text>
          <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
        </View>

        <View style={styles.divider} />

        {/* Action Item 2: Return window */}
        <View style={styles.actionRow}>
          <Ionicons
            name="calendar-outline"
            size={15}
            color="#374151"
            style={styles.actionIcon}
          />
          <View style={styles.actionColumn}>
            <Text style={styles.actionTitle}>Return window</Text>
            <Text style={styles.actionSublabel}>Ends Jan 12, 2025</Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
        </View>

        <View style={styles.divider} />

        {/* Action Item 3: Warranty */}
        <View style={styles.actionRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color="#374151"
            style={styles.actionIcon}
          />
          <View style={styles.actionColumn}>
            <Text style={styles.actionTitle}>Warranty</Text>
            <Text style={styles.actionSublabel}>
              1 year • Ends Oct 12, 2025
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 390,
    height: 345,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  containerCompact: {
    transform: [{ scale: 0.9 }],
  },
  bgGlow: {
    position: "absolute",
    width: 380,
    height: 380,
    top: -20,
    left: -10,
    opacity: 0.85,
  },
  floatingBadge: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    zIndex: 1,
  },
  badgeReceipt: {
    top: 14,
    left: 28,
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(224, 231, 255, 0.85)",
    shadowColor: "#6366F1",
  },
  receiptIcon: {
    width: 34,
    height: 34,
  },
  badgeShield: {
    top: 196,
    left: 14,
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "rgba(187, 247, 208, 0.9)",
    shadowColor: "#10B981",
  },
  badgeBell: {
    top: 136,
    right: 18,
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#FEFCE8",
    borderWidth: 1.5,
    borderColor: "rgba(254, 240, 138, 0.9)",
    shadowColor: "#F59E0B",
  },
  raysCornerContainer: {
    position: "absolute",
    top: -33,
    right: -21,
    width: 50,
    height: 44,
    zIndex: 10,
  },
  ray: {
    position: "absolute",
    width: 3.2,
    backgroundColor: "#5B43F6",
    borderRadius: 2,
  },
  ray1: {
    height: 18,
    top: 2,
    left: 8,
    transform: [{ rotate: "3deg" }],
  },
  ray2: {
    height: 20,
    top: 6,
    left: 23,
    transform: [{ rotate: "41deg" }],
  },
  ray3: {
    height: 18,
    top: 20,
    left: 37,
    transform: [{ rotate: "68deg" }],
  },
  mainCard: {
    width: 236,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingTop: 14,
    paddingHorizontal: 13,
    paddingBottom: 16,
    transform: [{ rotate: "6.0deg" }],
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 8,
    zIndex: 2,
    marginLeft: -10,
    overflow: "visible",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  storeDate: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  storePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 7,
    marginTop: 10,
    marginBottom: 9,
    gap: 9,
  },
  productImageBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  productImage: {
    width: 44,
    height: 44,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  productCategory: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  warrantyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 3,
    gap: 3,
  },
  warrantyPillText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#15803D",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4.5,
  },
  actionIcon: {
    marginRight: 8,
    width: 16,
  },
  actionLabelFull: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  actionColumn: {
    flex: 1,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 15,
  },
  actionSublabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
    lineHeight: 13,
  },
});
