import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import {
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
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
  const { tokens, preference, setPreference } = useTheme();

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.xl - 4}>
        <ScreenHeader title="Settings" />

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
              <View style={[styles.segmented, { gap: tokens.spacing.sm }]}>
                {THEMES.map((t) => {
                  const active = preference === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${t.label} theme`}
                      onPress={() => void setPreference(t.value)}
                      style={({ pressed }) => [
                        styles.segment,
                        {
                          backgroundColor: active
                            ? tokens.colors.accent
                            : tokens.colors.surfaceMuted,
                          borderRadius: tokens.radius.md,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={{
                          color: active
                            ? tokens.colors.accentText
                            : tokens.colors.text,
                          fontSize: tokens.type.bodySmall.fontSize,
                          fontWeight: "600",
                        }}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
    </>
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

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
});
