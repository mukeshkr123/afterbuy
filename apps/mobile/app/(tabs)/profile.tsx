// Profile screen matching design mockup
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? "rohan.verma@gmail.com";
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "Rohan Verma";

  const menuItems = [
    {
      id: "account",
      title: "Account Settings",
      route: "/settings",
    },
    {
      id: "connected",
      title: "Connected Accounts",
      route: "/settings",
    },
    {
      id: "address",
      title: "Address Book",
      route: "/settings",
    },
    {
      id: "payment",
      title: "Payment Methods",
      route: "/settings",
    },
    {
      id: "notifications",
      title: "Notification Preferences",
      route: "/settings",
    },
    {
      id: "app_settings",
      title: "Settings",
      route: "/settings",
    },
    {
      id: "permissions",
      title: "Permissions",
      route: "/settings/permissions",
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 12, 24),
          paddingBottom: Math.max(insets.bottom + 20, 28),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header User Profile Row */}
      <View style={styles.userHeaderRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.userMeta}>
          <Text style={[styles.userNameText, { color: textColor }]}>
            {userName}
          </Text>
          <Text style={[styles.userEmailText, { color: textMuted }]}>
            {userEmail}
          </Text>
        </View>
      </View>

      {/* Profile Menu Items List Card */}
      <View style={[styles.menuGroupCard, { backgroundColor: cardBg }]}>
        {menuItems.map((item, idx) => {
          const isLast = idx === menuItems.length - 1;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.menuItem,
                !isLast && {
                  borderBottomColor: borderColor,
                  borderBottomWidth: 1,
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <Text style={[styles.menuItemTitle, { color: textColor }]}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          );
        })}
      </View>

      {/* Sign Out Action Button */}
      <Pressable
        style={styles.signOutButton}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 22,
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  userMeta: {
    gap: 3,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  userEmailText: {
    fontSize: 14,
  },
  menuGroupCard: {
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
