import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
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
  icon:
    | "settings-outline"
    | "notifications-outline"
    | "time-outline"
    | "shield-checkmark-outline";
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
    title: "Account Settings",
    subtitle: "Profile, theme and security",
    icon: "settings-outline",
    href: "/settings",
  },
  {
    id: "permissions",
    title: "Permissions",
    subtitle: "Notifications and device access",
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

  return (
    <>
      <ScreenScroll
        gap={tokens.spacing.lg + 2}
        contentStyle={{
          paddingTop: Math.max(insets.top + tokens.spacing.md, 24),
          paddingBottom: Math.max(insets.bottom + 88, 112),
        }}
      >
        <View style={[styles.userHeaderRow, { gap: tokens.spacing.md + 2 }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatarCircle,
              { backgroundColor: tokens.colors.primary },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color: tokens.colors.onPrimary,
                  fontSize: 22,
                },
              ]}
            >
              {initials}
            </Text>
          </View>

          <View style={{ gap: 2, flex: 1, justifyContent: "center" }}>
            <Text
              numberOfLines={1}
              style={[
                styles.userNameText,
                {
                  color: tokens.colors.text,
                  fontSize: 22,
                },
              ]}
            >
              {userName}
            </Text>
            {userEmail ? (
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: 15,
                }}
              >
                {userEmail}
              </Text>
            ) : null}
          </View>
        </View>

        <SectionCard flush>
          {MENU.map((item, idx) => (
            <ListItem
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              divider={idx < MENU.length - 1}
              leading={<IconTile icon={item.icon} tone="neutral" />}
              chevron
              onPress={() => router.push(item.href)}
            />
          ))}
        </SectionCard>

        <View style={{ marginTop: 6, gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => setConfirmSignOut(true)}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.signOutText, { color: tokens.colors.text }]}>
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

const styles = StyleSheet.create({
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
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
    height: 50,
    borderRadius: 14,
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
