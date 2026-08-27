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
  Tabs,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/settings";

const THEMES: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, preference, setPreference } = useTheme();

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;

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
          <SectionLabel>Appearance</SectionLabel>
          <SectionCard>
            <View style={{ gap: tokens.spacing.md }}>
              <Text
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                Theme
              </Text>
              {/* A three-way choice, not a switch — "system" is a real stored
                  preference that a boolean toggle silently discarded. */}
              <Tabs
                tabs={THEMES.map((theme) => ({
                  key: theme.value,
                  label: theme.label,
                }))}
                activeKey={preference}
                onChange={(next) => void setPreference(next as ThemePreference)}
              />
            </View>
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Reminders</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="Reminder Timing"
              subtitle="How far ahead we warn you"
              leading={<IconTile icon="time-outline" tone="accent" />}
              chevron
              onPress={() => router.push("/settings/lead-days")}
            />
            <ListItem
              title="Time Zone"
              subtitle="When daily reminders are sent"
              divider={false}
              leading={<IconTile icon="globe-outline" tone="accent" />}
              chevron
              onPress={() => router.push("/settings/timezone")}
            />
          </SectionCard>
        </View>

        <View style={{ gap: tokens.spacing.md - 2 }}>
          <SectionLabel>Privacy</SectionLabel>
          <SectionCard flush>
            <ListItem
              title="App Permissions"
              subtitle="Notifications, camera and photos"
              leading={<IconTile icon="lock-closed-outline" tone="neutral" />}
              chevron
              onPress={() => router.push("/settings/permissions")}
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
