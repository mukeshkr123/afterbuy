import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export function OnboardingHubIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { tokens, isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {/* Ultra-subtle ambient glow */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isLight
              ? "rgba(79, 70, 229, 0.03)"
              : "rgba(129, 140, 248, 0.04)",
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
              borderColor: tokens.colors.border,
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
            size={13}
            color={tokens.colors.warning}
          />
          <Text style={[styles.bannerText, { color: tokens.colors.text }]}>
            Return window · <Text style={styles.boldText}>12 days left</Text>
          </Text>
        </View>

        {/* Main Purchase Card */}
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
                { backgroundColor: tokens.colors.accentSoft },
              ]}
            >
              <Ionicons
                name="laptop-outline"
                size={18}
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
                size={12}
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
            <View
              style={[
                styles.gridPill,
                { backgroundColor: tokens.colors.surfaceMuted },
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={13}
                color={tokens.colors.textSubtle}
              />
              <Text
                style={[styles.gridPillText, { color: tokens.colors.text }]}
              >
                Delivered today
              </Text>
            </View>

            <View
              style={[
                styles.gridPill,
                { backgroundColor: tokens.colors.surfaceMuted },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={13}
                color={tokens.colors.textSubtle}
              />
              <Text
                style={[styles.gridPillText, { color: tokens.colors.text }]}
              >
                Receipt saved
              </Text>
            </View>
          </View>
        </View>

        {/* Floating Stack Card 2: Warranty Banner (Bottom-Left) */}
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
              size={12}
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
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  compact: {
    transform: [{ scale: 0.76 }],
  },
  ambientGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  deckContainer: {
    width: "100%",
    maxWidth: 324,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mainCard: {
    width: "95%",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 2,
    marginTop: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCol: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 11,
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
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  gridPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  floatingBanner: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 3,
  },
  returnBannerPos: {
    top: 4,
    right: 6,
  },
  warrantyBannerPos: {
    bottom: 6,
    left: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shieldIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "400",
  },
  boldText: {
    fontWeight: "600",
  },
});
