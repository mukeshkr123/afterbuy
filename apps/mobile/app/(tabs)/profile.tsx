import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Dialog,
  IconTile,
  ListItem,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

// Only destinations that exist. The screen previously listed "Connected
// Accounts", "Address Book", "Payment Methods" and "Notification Preferences",
// all of which routed to /settings and none of which are built.
const MENU: ReadonlyArray<{
  id: string;
  title: string;
  subtitle: string;
  icon: "settings-outline" | "notifications-outline" | "time-outline";
  href: Href;
}> = [
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
    subtitle: "How far ahead we warn you",
    icon: "time-outline",
    href: "/settings/lead-days",
  },
];

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const { tokens } = useTheme();
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
      <ScreenScroll gap={tokens.spacing.xl - 2}>
        <View style={[styles.userHeaderRow, { gap: tokens.spacing.lg }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatarCircle,
              { backgroundColor: tokens.colors.accent },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color: tokens.colors.accentText,
                  fontSize: tokens.type.title.fontSize,
                },
              ]}
            >
              {initials}
            </Text>
          </View>

          <View style={{ gap: 3, flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[
                styles.userNameText,
                {
                  color: tokens.colors.text,
                  fontSize: tokens.type.title.fontSize - 2,
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
                  fontSize: tokens.type.bodySmall.fontSize,
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

        <Button
          label="Sign Out"
          variant="ghost"
          onPress={() => setConfirmSignOut(true)}
        />
      </ScreenScroll>

      <Dialog
        visible={confirmSignOut}
        title="Sign out?"
        description="Your orders stay saved to your account. You'll need to sign in again to see them."
        primaryLabel="Sign out"
        onPrimary={() => {
          setConfirmSignOut(false);
          void signOut();
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
    marginVertical: 4,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
  },
  userNameText: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
