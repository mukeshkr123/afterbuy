import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export function OnboardingReceiptScanIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { tokens, isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {/* Subtle ambient glow */}
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

      <View style={styles.deckContainer}>
        {/* Paper Receipt background layer */}
        <View
          style={[
            styles.paperReceipt,
            {
              backgroundColor: isLight ? "#F3F3F7" : "#1A1A24",
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <View style={styles.receiptHeader}>
            <View
              style={[
                styles.receiptBar,
                { backgroundColor: tokens.colors.icon, opacity: 0.35 },
              ]}
            />
            <View
              style={[
                styles.receiptBarShort,
                { backgroundColor: tokens.colors.icon, opacity: 0.25 },
              ]}
            />
          </View>
          <View style={styles.receiptLines}>
            <View
              style={[
                styles.receiptLine,
                { backgroundColor: tokens.colors.icon, opacity: 0.2 },
              ]}
            />
            <View
              style={[
                styles.receiptLine,
                { backgroundColor: tokens.colors.icon, opacity: 0.2 },
              ]}
            />
            <View
              style={[
                styles.receiptLineShort,
                { backgroundColor: tokens.colors.icon, opacity: 0.2 },
              ]}
            />
          </View>
        </View>

        {/* Front Structured Digital Card */}
        <View
          style={[
            styles.digitalCard,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              ...tokens.shadow.card,
            },
          ]}
        >
          {/* Laser Scanning Indicator Badge on Top Border */}
          <View
            style={[
              styles.scanLabelBadge,
              { backgroundColor: tokens.colors.accent },
            ]}
          >
            <Ionicons name="sparkles" size={10} color="#FFFFFF" />
            <Text style={styles.scanLabelText}>AUTO-SCAN</Text>
          </View>

          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.merchantIcon,
                { backgroundColor: isLight ? "#EEF2FF" : "#1E1B4B" },
              ]}
            >
              <Ionicons
                name="cart-outline"
                size={18}
                color={tokens.colors.accent}
              />
            </View>
            <View style={styles.merchantMeta}>
              <Text
                style={[styles.merchantName, { color: tokens.colors.text }]}
              >
                Target Store
              </Text>
              <Text
                style={[
                  styles.parsedTimestamp,
                  { color: tokens.colors.textMuted },
                ]}
              >
                Auto-extracted receipt
              </Text>
            </View>
            <View
              style={[
                styles.autoParsedTag,
                { backgroundColor: tokens.colors.accentSoft },
              ]}
            >
              <Ionicons name="flash" size={11} color={tokens.colors.accent} />
              <Text
                style={[styles.autoParsedText, { color: tokens.colors.accent }]}
              >
                Instant
              </Text>
            </View>
          </View>

          {/* Structured Line Items */}
          <View style={styles.itemRow}>
            <Text
              style={[styles.itemName, { color: tokens.colors.text }]}
              numberOfLines={1}
            >
              Dyson V15 Vacuum
            </Text>
            <Text style={[styles.itemPrice, { color: tokens.colors.text }]}>
              $699.99
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text
              style={[styles.itemName, { color: tokens.colors.textMuted }]}
              numberOfLines={1}
            >
              Sales Tax (8.875%)
            </Text>
            <Text
              style={[styles.itemPrice, { color: tokens.colors.textMuted }]}
            >
              $62.12
            </Text>
          </View>

          <View
            style={[
              styles.totalBar,
              { backgroundColor: tokens.colors.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.totalLabel, { color: tokens.colors.textMuted }]}
            >
              Total Stored
            </Text>
            <Text style={[styles.totalAmount, { color: tokens.colors.text }]}>
              $762.11
            </Text>
          </View>
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
  compact: {
    transform: [{ scale: 0.72 }],
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
  paperReceipt: {
    position: "absolute",
    top: 14,
    width: 220,
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    transform: [{ rotate: "-4deg" }],
    opacity: 0.65,
  },
  receiptHeader: {
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  receiptBar: {
    width: 80,
    height: 8,
    borderRadius: 4,
  },
  receiptBarShort: {
    width: 50,
    height: 6,
    borderRadius: 3,
  },
  receiptLines: {
    gap: 8,
  },
  receiptLine: {
    width: "100%",
    height: 5,
    borderRadius: 3,
  },
  receiptLineShort: {
    width: "60%",
    height: 5,
    borderRadius: 3,
  },
  digitalCard: {
    width: "94%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 26,
    zIndex: 3,
    position: "relative",
  },
  scanLabelBadge: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 5,
  },
  scanLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  },
  merchantIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantMeta: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  parsedTimestamp: {
    fontSize: 11,
    fontWeight: "500",
  },
  autoParsedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  autoParsedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
});
