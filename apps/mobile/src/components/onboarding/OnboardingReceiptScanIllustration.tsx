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

      <View style={styles.deckContainer}>
        {/* Paper Receipt background layer */}
        <View
          style={[
            styles.paperReceipt,
            {
              backgroundColor: isLight ? "#F4F4F7" : "#1A1A24",
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <View style={styles.receiptHeader}>
            <View
              style={[
                styles.receiptBar,
                { backgroundColor: tokens.colors.icon, opacity: 0.3 },
              ]}
            />
            <View
              style={[
                styles.receiptBarShort,
                { backgroundColor: tokens.colors.icon, opacity: 0.2 },
              ]}
            />
          </View>
          <View style={styles.receiptLines}>
            <View
              style={[
                styles.receiptLine,
                { backgroundColor: tokens.colors.icon, opacity: 0.15 },
              ]}
            />
            <View
              style={[
                styles.receiptLine,
                { backgroundColor: tokens.colors.icon, opacity: 0.15 },
              ]}
            />
            <View
              style={[
                styles.receiptLineShort,
                { backgroundColor: tokens.colors.icon, opacity: 0.15 },
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
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.merchantIcon,
                { backgroundColor: tokens.colors.accentSoft },
              ]}
            >
              <Ionicons
                name="receipt-outline"
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
                Purchase receipt
              </Text>
            </View>
            <View
              style={[
                styles.savedTag,
                { backgroundColor: tokens.colors.accentSoft },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={12}
                color={tokens.colors.accent}
              />
              <Text
                style={[styles.savedTagText, { color: tokens.colors.accent }]}
              >
                Saved
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
              Total stored
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
  paperReceipt: {
    position: "absolute",
    top: 10,
    width: 210,
    height: 135,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    transform: [{ rotate: "-4deg" }],
    opacity: 0.6,
  },
  receiptHeader: {
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  receiptBar: {
    width: 70,
    height: 7,
    borderRadius: 3.5,
  },
  receiptBarShort: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  receiptLines: {
    gap: 7,
  },
  receiptLine: {
    width: "100%",
    height: 4.5,
    borderRadius: 2.5,
  },
  receiptLineShort: {
    width: "55%",
    height: 4.5,
    borderRadius: 2.5,
  },
  digitalCard: {
    width: "95%",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    zIndex: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
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
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  parsedTimestamp: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
  },
  savedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  savedTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "600",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
});
