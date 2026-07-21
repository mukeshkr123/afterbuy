import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export function OnboardingHubIllustration() {
  const { tokens, isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={styles.container}>
      {/* Subtle lavender ambient shape */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isLight
              ? "rgba(79, 70, 229, 0.06)"
              : "rgba(129, 140, 248, 0.08)",
          },
        ]}
      />

      {/* Main Container Deck */}
      <View style={styles.deckContainer}>
        {/* Floating Stack Card 1: Return Window Banner (Top-Right) */}
        <View
          style={[
            styles.floatingBanner,
            styles.returnBannerPos,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: isLight ? "#FDE68A" : "#78350F",
              ...tokens.shadow.raised,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: tokens.colors.warning },
            ]}
          />
          <Ionicons
            name="time-outline"
            size={14}
            color={tokens.colors.warning}
          />
          <Text style={[styles.bannerText, { color: tokens.colors.text }]}>
            Return window · <Text style={styles.boldText}>12 days left</Text>
          </Text>
        </View>

        {/* Top Header Card - Main Order Status */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              ...tokens.shadow.card,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isLight ? "#EEF2FF" : "#1E1B4B" },
              ]}
            >
              <Ionicons
                name="laptop-outline"
                size={20}
                color={tokens.colors.accent}
              />
            </View>

            <View style={styles.cardTitleCol}>
              <Text
                style={[styles.itemTitle, { color: tokens.colors.text }]}
                numberOfLines={1}
              >
                MacBook Pro 14″
              </Text>
              <Text
                style={[
                  styles.itemSubtitle,
                  { color: tokens.colors.textMuted },
                ]}
              >
                Apple Store · $2,499.00
              </Text>
            </View>

            <View
              style={[
                styles.verifiedBadge,
                { backgroundColor: tokens.colors.successSoft },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={tokens.colors.success}
              />
              <Text
                style={[
                  styles.verifiedText,
                  { color: tokens.colors.successText },
                ]}
              >
                Tracked
              </Text>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: tokens.colors.border }]}
          />

          {/* Sub-features grid inside card */}
          <View style={styles.cardGrid}>
            {/* Delivery status */}
            <View
              style={[
                styles.gridPill,
                { backgroundColor: tokens.colors.surfaceMuted },
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={14}
                color={tokens.colors.accent}
              />
              <Text
                style={[styles.gridPillText, { color: tokens.colors.text }]}
              >
                Delivered today
              </Text>
            </View>

            {/* Receipt status */}
            <View
              style={[
                styles.gridPill,
                { backgroundColor: tokens.colors.surfaceMuted },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={14}
                color={tokens.colors.accent}
              />
              <Text
                style={[styles.gridPillText, { color: tokens.colors.text }]}
              >
                Receipt saved
              </Text>
            </View>
          </View>
        </View>

        {/* Floating Stack Card 2: Warranty Shield Banner (Bottom-Left) */}
        <View
          style={[
            styles.floatingBanner,
            styles.warrantyBannerPos,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              ...tokens.shadow.raised,
            },
          ]}
        >
          <View
            style={[
              styles.shieldIconBox,
              { backgroundColor: tokens.colors.accentSoft },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={tokens.colors.accent}
            />
          </View>
          <Text style={[styles.bannerText, { color: tokens.colors.text }]}>
            AppleCare+ · <Text style={styles.boldText}>Active until 2027</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ambientGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  deckContainer: {
    width: "100%",
    maxWidth: 328,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mainCard: {
    width: "94%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 2,
    marginTop: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCol: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardGrid: {
    flexDirection: "row",
    gap: 8,
  },
  gridPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  gridPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  floatingBanner: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 3,
  },
  returnBannerPos: {
    top: 2,
    right: 6,
  },
  warrantyBannerPos: {
    bottom: 4,
    left: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shieldIconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  boldText: {
    fontWeight: "700",
  },
});
