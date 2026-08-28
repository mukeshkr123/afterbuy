import { useClerk, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText,
  Dialog,
  IconTile,
  ListItem,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import { useApi } from "@/api/ApiProvider";
import { unregisterCurrentDevice } from "@/notifications/PushRegistration";
import { useQueryClient } from "@tanstack/react-query";
import { outbox } from "@/offline/outbox";

// Only destinations that exist. The screen previously listed "Connected
// Accounts", "Address Book", "Payment Methods" and "Notification Preferences",
// all of which routed to /settings and none of which are built.
const MENU: ReadonlyArray<{
  id: string;
  title: string;
  subtitle: string;
  icon: "notifications-outline" | "time-outline";
  href: Href;
}> = [
  {
    id: "permissions",
    title: "Permissions",
    subtitle: "Manage app access and notifications",
    icon: "notifications-outline",
    href: "/settings/permissions",
  },
  {
    id: "lead-days",
    title: "Reminder Timing",
    subtitle: "Choose how early reminders arrive",
    icon: "time-outline",
    href: "/settings/lead-days",
  },
];

const QUICK_MENU: ReadonlyArray<{
  id: string;
  title: string;
  subtitle: string;
  icon: "shield-checkmark-outline" | "settings-outline";
  href: Href;
}> = [
  {
    id: "claims",
    title: "Claims",
    subtitle: "Returns, refunds, and warranty claims",
    icon: "shield-checkmark-outline",
    href: "/claims" as Href,
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences and customization",
    icon: "settings-outline",
    href: "/settings",
  },
];

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const { tokens, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";
  const userName =
    user?.fullName ||
    (user?.firstName
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : "") ||
    userEmail ||
    "Your account";

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <>
      <ScreenScroll
        density="compact"
        gap={tokens.spacing.lg}
        contentStyle={{
          paddingTop: Math.max(insets.top + tokens.spacing.sm, 20),
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
      >
        <View style={styles.accountTitleRow}>
          <AppText role="screenTitle" tone="strong">
            Account
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification permissions"
            onPress={() => router.push("/settings/permissions")}
            hitSlop={8}
            style={({ pressed }) => [
              styles.bellButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={tokens.colors.text}
            />
          </Pressable>
        </View>

        <View style={[styles.userHeaderRow, { gap: tokens.spacing.md }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatarCircle,
              { backgroundColor: tokens.colors.primary },
            ]}
          >
            <AppText
              role="title"
              style={[
                styles.avatarText,
                { color: tokens.colors.action.onPrimary },
              ]}
            >
              {initials}
            </AppText>
          </View>

          <View style={{ gap: 2, flex: 1, justifyContent: "center" }}>
            <AppText role="title" numberOfLines={1} style={styles.userNameText}>
              {userName}
            </AppText>
            {userEmail ? (
              <AppText role="subheadline" tone="subtle" numberOfLines={1}>
                {userEmail}
              </AppText>
            ) : null}
          </View>
        </View>

        <SectionCard flush surface="grouped">
          <ListItem
            density="compact"
            title="Membership"
            subtitle={memberSince}
            divider={false}
            leading={<IconTile icon="calendar-outline" tone="neutral" />}
          />
        </SectionCard>

        <SectionCard flush surface="grouped">
          {QUICK_MENU.map((item, idx) => (
            <ListItem
              key={item.id}
              density="compact"
              title={item.title}
              subtitle={item.subtitle}
              divider={idx < QUICK_MENU.length - 1}
              leading={<IconTile icon={item.icon} tone="neutral" />}
              chevron
              onPress={() => router.push(item.href)}
            />
          ))}
        </SectionCard>

        <SectionCard flush surface="grouped">
          {MENU.map((item, idx) => (
            <ListItem
              key={item.id}
              density="compact"
              title={item.title}
              subtitle={item.subtitle}
              divider={idx < MENU.length - 1}
              leading={<IconTile icon={item.icon} tone="neutral" />}
              chevron
              onPress={() => router.push(item.href)}
            />
          ))}
        </SectionCard>

        <View style={{ marginTop: 4, gap: tokens.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => setConfirmSignOut(true)}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.lg,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
              },
            ]}
          >
            <Text
              style={[styles.signOutText, { color: tokens.colors.dangerText }]}
            >
              Sign out
            </Text>
          </Pressable>

          <Text
            style={[styles.versionText, { color: tokens.colors.textMuted }]}
          >
            AfterBuy 1.0.0
          </Text>
        </View>
      </ScreenScroll>

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

function formatMemberSince(value: Date | string | number | null | undefined) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  accountTitleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  userNameText: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  signOutButton: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
  },
});
