import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Skeleton, useAdaptiveLayout } from "@/components";
import { PurchaseArtworkTile } from "@/components/PurchaseArtworkTile";
import { apiKeys } from "@/api/apiKeys";
import { useApi } from "@/api/ApiProvider";
import { getPurchase } from "@/api/purchases";
import { formatMoney } from "@/components/Money";
import { categoryLabel, formatDate } from "@/lib/purchaseDisplay";

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const purchase = useQuery({
    queryKey: apiKeys.purchases.detail(id ?? ""),
    queryFn: () => getPurchase(api, id ?? ""),
    enabled: Boolean(id),
  });

  const p = purchase.data;
  const purchaseDate = formatDate(p?.purchaseDate);
  const formattedAmount = p ? formatMoney(p.amountMinor, p.currency) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        {/* Ambient top-right pastel glow */}
        <View style={styles.ambientGlowTopRight} pointerEvents="none" />

        <View
          style={[
            styles.container,
            {
              width: "100%",
              maxWidth: contentWidth,
              alignSelf: "center",
              paddingHorizontal: 20,
              paddingTop: Math.max(insets.top + 32, 48),
              paddingBottom: Math.max(insets.bottom + 24, 32),
            },
          ]}
        >
          <View style={styles.centerContent}>
            {/* Green Checkmark Badge */}
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={44} color="#16A34A" />
            </View>

            <View style={styles.textStack}>
              <Text style={styles.mainTitle}>Purchase saved</Text>
              <Text style={styles.subtitle}>
                Return windows, warranty dates, delivery notes, and receipts now
                live together.
              </Text>
            </View>

            {purchase.isLoading ? (
              <View style={{ width: "100%", marginTop: 24 }}>
                <Skeleton height={86} />
              </View>
            ) : p ? (
              <View style={styles.summaryCard}>
                <PurchaseArtworkTile
                  title={p.title}
                  category={p.category}
                  size={52}
                />
                <View style={styles.summaryCopy}>
                  <Text numberOfLines={2} style={styles.summaryTitle}>
                    {p.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.summarySubtitle}>
                    {[p.merchant, categoryLabel(p.category), purchaseDate]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {formattedAmount ? (
                    <Text style={styles.summaryPrice}>{formattedAmount}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            {id ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View purchase"
                onPress={() =>
                  router.replace({
                    pathname: "/purchase/[id]",
                    params: { id },
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>View purchase</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add another purchase"
              onPress={() => router.replace("/purchase/new")}
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                Add another purchase
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to purchases"
              onPress={() => router.replace("/(tabs)/purchases")}
              style={({ pressed }) => [
                styles.tertiaryButton,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={styles.tertiaryButtonText}>Back to purchases</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  ambientGlowTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 280,
    height: 240,
    borderRadius: 140,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  textStack: {
    alignItems: "center",
    gap: 8,
    maxWidth: 320,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  summarySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  buttonGroup: {
    gap: 10,
    width: "100%",
  },
  primaryButton: {
    height: 52,
    backgroundColor: "#775DF5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  tertiaryButton: {
    height: 44,
    backgroundColor: "#F1F5FD",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4DF5",
  },
});
