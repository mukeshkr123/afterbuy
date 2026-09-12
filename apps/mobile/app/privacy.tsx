import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from "@/lib/publicLinks";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Ambient pastel glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How We Handle Your Data</Text>
          <Text style={styles.body}>
            AfterBuy stores the purchase, receipt, reminder, claim, and account
            information you add so the app can provide purchase management,
            receipt storage, and reminder notifications.
          </Text>
          <Text style={styles.body}>
            We use Clerk for authentication and Cloudflare for API, database,
            queue, and receipt storage infrastructure. Receipt files are used
            only to provide the app features you request.
          </Text>
          <Text style={styles.body}>
            You can request deletion in the app from Settings, or contact{" "}
            {SUPPORT_EMAIL}. Account deletion permanently removes app data and
            receipt files.
          </Text>

          {PRIVACY_POLICY_URL ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && styles.linkBtnPressed,
              ]}
            >
              <Text style={styles.linkBtnText}>Open Full Privacy Policy</Text>
              <Ionicons name="open-outline" size={16} color="#775DF5" />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  body: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
    marginTop: 6,
  },
  linkBtnPressed: {
    backgroundColor: "#EDE9FE",
  },
  linkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#775DF5",
  },
});
