import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  mailtoSupport,
} from "@/lib/publicLinks";

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Modern Header */}
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
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="headset-outline" size={28} color="#775DF5" />
          </View>
          <View style={{ gap: 4, alignItems: "center" }}>
            <Text style={styles.heroTitle}>We're here to help</Text>
            <Text style={styles.heroSubtitle}>
              Have questions about purchases, return windows, receipt scanning,
              or warranty reminders?
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(mailtoSupport())}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Ionicons name="mail" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Email {SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>

        {/* Resources & Links */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>RESOURCES & POLICIES</Text>
          <View style={styles.groupCard}>
            <SupportRow
              icon="help-circle-outline"
              iconBg="#EEF2FF"
              iconColor="#6366F1"
              title="Help Center"
              subtitle="Guides for purchases, warranties & claims"
              onPress={() =>
                void Linking.openURL(
                  mailtoSupport("AfterBuy help center question")
                )
              }
            />
            <View style={styles.separator} />
            <SupportRow
              icon="chatbubbles-outline"
              iconBg="#ECFDF5"
              iconColor="#059669"
              title="Contact Support"
              subtitle="Average response time under 24 hours"
              onPress={() => void Linking.openURL(mailtoSupport())}
            />
            {PRIVACY_POLICY_URL ? (
              <>
                <View style={styles.separator} />
                <SupportRow
                  icon="shield-checkmark-outline"
                  iconBg="#FEF3C7"
                  iconColor="#D97706"
                  title="Privacy Policy"
                  subtitle="How we protect and handle your purchase data"
                  onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
                />
              </>
            ) : null}
            {ACCOUNT_DELETION_URL ? (
              <>
                <View style={styles.separator} />
                <SupportRow
                  icon="trash-outline"
                  iconBg="#FFE4E6"
                  iconColor="#E11D48"
                  title="Account Deletion"
                  subtitle="Request removal of account from web"
                  onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}
                />
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SupportRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
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
    gap: 24,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 24,
    alignItems: "center",
    gap: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
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
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 70,
  },
});
