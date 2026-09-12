import { useClerk, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Dialog, useAdaptiveLayout } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import { useApi } from "@/api/ApiProvider";
import { unregisterCurrentDevice } from "@/notifications/PushRegistration";
import { useQueryClient } from "@tanstack/react-query";
import { outbox } from "@/offline/outbox";

interface NavMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  href: Href;
}

const NAV_MENU: ReadonlyArray<NavMenuItem> = [
  {
    id: "claims",
    title: "Claims",
    subtitle: "Returns, refunds, and warranty claims",
    icon: "shield-checkmark-outline",
    iconBg: "#ECFDF5",
    iconColor: "#059669",
    href: "/claims" as Href,
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences and customization",
    icon: "settings-outline",
    iconBg: "#EEF2FF",
    iconColor: "#6366F1",
    href: "/settings",
  },
  {
    id: "permissions",
    title: "Permissions",
    subtitle: "Manage app access and notifications",
    icon: "notifications-outline",
    iconBg: "#FFF7ED",
    iconColor: "#D97706",
    href: "/settings/permissions",
  },
  {
    id: "lead-days",
    title: "Reminder Timing",
    subtitle: "Choose how early reminders arrive",
    icon: "time-outline",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    href: "/settings/lead-days",
  },
];

function formatMemberDate(dateVal: Date | string | number | null | undefined): string {
  if (!dateVal) return "12 Sep 2026";
  const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (Number.isNaN(date.getTime())) return "12 Sep 2026";

  const day = date.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()] ?? "Sep";
  const year = date.getFullYear();
  return `${day < 10 ? `0${day}` : day} ${month} ${year}`;
}

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const { tokens, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const rawEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";
  const userEmail = rawEmail || "mkmehta2041@gmail.com";

  const clerkFullName = user?.fullName?.trim();
  const clerkFirstName = user?.firstName?.trim();
  const clerkLastName = user?.lastName?.trim();

  const userName =
    clerkFullName ||
    (clerkFirstName
      ? `${clerkFirstName} ${clerkLastName ?? ""}`.trim()
      : "") ||
    "Mukesh Kumar";

  const initials =
    userName
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MK";

  const memberDate = formatMemberDate(user?.createdAt);
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";

  return (
    <>
      <View style={styles.screen}>
        {/* Ambient background glows */}
        <View style={styles.ambientGlowTopRight} pointerEvents="none" />
        <View style={styles.ambientGlowBottomLeft} pointerEvents="none" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top + 6, 16),
            paddingBottom: Math.max(insets.bottom + 90, 100),
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row: Title & Subtitle + Bell with purple unread badge */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.screenTitle}>Account</Text>
              <Text style={styles.screenSubtitle}>
                Manage your account and preferences.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications and permissions"
              onPress={() => router.push("/settings/permissions")}
              style={({ pressed }) => [
                styles.bellButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#0F172A"
              />
              <View style={styles.unreadDot} />
            </Pressable>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileCard}>
            {/* Subtle internal atmospheric glow */}
            <View style={styles.profileCardGlow} pointerEvents="none" />

            {/* Top row: Avatar + Name/Email + Edit button */}
            <View style={styles.profileTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.profileDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {userEmail}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [
                  styles.editButton,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name="pencil" size={13} color="#5B4DF5" />
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>

            {/* Bottom banner: Glad to have you back! */}
            <View style={styles.profileBanner}>
              <Text style={styles.bannerHeadline}>Glad to have you back!</Text>
              <Text style={styles.bannerTagline}>
                Keep track. Buy smarter. Live simpler.
              </Text>
            </View>
          </View>

          {/* Standalone Membership Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Membership, ${memberDate}`}
            onPress={() => router.push("/settings")}
            style={({ pressed }) => [
              styles.membershipCard,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <View style={styles.membershipIconBox}>
              <Ionicons name="calendar-outline" size={24} color="#5B4DF5" />
            </View>

            <View style={styles.membershipCopy}>
              <Text style={styles.membershipTitle}>Membership</Text>
              <Text style={styles.membershipSubtitle}>{memberDate}</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          {/* Grouped Navigation & Settings Card */}
          <View style={styles.navGroupCard}>
            {NAV_MENU.map((item, idx) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.subtitle}`}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.navRow,
                  idx < NAV_MENU.length - 1 && styles.navRowDivider,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.navIconBox,
                    { backgroundColor: item.iconBg },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.iconColor}
                  />
                </View>

                <View style={styles.navCopy}>
                  <Text style={styles.navTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.navSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />
              </Pressable>
            ))}
          </View>

          {/* Sign Out Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => setConfirmSignOut(true)}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          {/* Version Footer */}
          <Text style={styles.versionText}>AfterBuy {version}</Text>
        </ScrollView>
      </View>

      {/* Sign Out Confirmation Dialog */}
      <Dialog
        visible={confirmSignOut}
        title="Sign out?"
        description="You'll need to sign in again to access your purchases."
        primaryLabel="Sign out"
        destructive
        onPrimary={() => {
          setConfirmSignOut(false);
          void (async () => {
            try {
              await unregisterCurrentDevice(api);
            } catch {
              // Signing out must still work if the API is unavailable.
            }
            try {
              await outbox.reset();
            } catch {
              // Outbox reset failure shouldn't block sign out.
            }
            qc.clear();
            await signOut();
          })();
        }}
        secondaryLabel="Cancel"
        onDismiss={() => setConfirmSignOut(false)}
      />
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
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "#EDE9FE",
    opacity: 0.6,
  },
  ambientGlowBottomLeft: {
    position: "absolute",
    bottom: 60,
    left: -60,
    width: 260,
    height: 200,
    borderRadius: 130,
    backgroundColor: "#E0E7FE",
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 21,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#5B4DF5",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 18,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 16,
  },
  profileCardGlow: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#EDE9FE",
    opacity: 0.5,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5B4DF5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  profileDetails: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },
  editButton: {
    backgroundColor: "#F1F5F9",
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5B4DF5",
  },
  profileBanner: {
    gap: 3,
    paddingTop: 4,
  },
  bannerHeadline: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B4DF5",
  },
  bannerTagline: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  membershipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  membershipIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  membershipCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  membershipSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },
  navGroupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  navRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  navIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  navCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  signOutButton: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: -0.2,
  },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 2,
  },
});
