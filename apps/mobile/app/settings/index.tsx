import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import {
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { tokens } = useTheme();

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "Not available";

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Settings" />
      </View>

      <ScreenScroll
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{
          paddingTop: tokens.spacing.lg,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
      >
        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Preferences</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="Appearance"
              subtitle="Theme, colors, and display"
              leading={<IconTile icon="color-palette-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/settings/appearance")}
            />
            <ListItem
              title="Reminder Timing"
              subtitle="How far ahead we warn you"
              leading={<IconTile icon="time-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/settings/lead-days")}
            />
            <ListItem
              title="Time Zone"
              subtitle="When daily reminders are sent"
              divider={false}
              leading={<IconTile icon="globe-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/settings/timezone")}
            />
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Account</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="Email"
              subtitle={email}
              leading={<IconTile icon="mail-outline" tone="neutral" />}
            />
            <ListItem
              title="Delete Account"
              subtitle="Permanently remove your data"
              divider={false}
              leading={<IconTile icon="trash-outline" tone="warning" />}
              chevron
              onPress={() => router.push("/delete-account")}
            />
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>App</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="App Permissions"
              subtitle="Notifications, camera and photos"
              leading={<IconTile icon="lock-closed-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/settings/permissions")}
            />
            <ListItem
              title="Help & Support"
              subtitle="Get help or send feedback"
              divider={false}
              leading={<IconTile icon="help-circle-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/support")}
            />
          </SectionCard>
        </View>

        {version ? (
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.bodySmall.fontSize,
              textAlign: "center",
            }}
          >
            AfterBuy {version}
          </Text>
        ) : null}
      </ScreenScroll>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={{
        color: tokens.colors.text,
        fontSize: tokens.type.bodySmall.fontSize + 1,
        fontWeight: "700",
      }}
    >
      {children}
    </Text>
  );
}
