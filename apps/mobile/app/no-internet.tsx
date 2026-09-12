import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useOnline } from "@/offline";

export default function NoInternetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const online = useOnline();

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Ambient background glow */}
      <View
        style={[styles.ambientGlow, online && { backgroundColor: "#DCFCE7" }]}
        pointerEvents="none"
      />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Network Status</Text>
        <View style={{ width: 42 }} />
      </View>

      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 28, 36) },
        ]}
      >
        <View style={styles.centerContent}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: online ? "#DCFCE7" : "#FEE2E2",
                borderColor: online ? "#BBF7D0" : "#FECDD3",
              },
            ]}
          >
            <Ionicons
              name={online ? "wifi" : "cloud-offline-outline"}
              size={56}
              color={online ? "#16A34A" : "#DC2626"}
            />
          </View>

          <Text accessibilityRole="header" style={styles.mainTitle}>
            {online ? "You're Back Online" : "Working Offline"}
          </Text>

          <Text style={styles.subtitle}>
            {online
              ? "Your connection has been restored. All offline changes are syncing with your account."
              : "AfterBuy is built offline-first. All your purchases, receipts, and warranties remain available, and new items will sync once you reconnect."}
          </Text>

          {!online && (
            <View style={styles.offlineBadge}>
              <Ionicons name="sync-outline" size={16} color="#6366F1" />
              <Text style={styles.offlineBadgeText}>
                Offline storage active • Auto-sync enabled
              </Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {online ? "Continue to App" : "Dismiss & Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 320,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  offlineBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
