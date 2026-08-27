import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Button, ScreenHeader, ScreenScroll } from "@/components";
import { patchMe } from "@/api/auth";
import { apiKeys } from "@/api/apiKeys";
import { useApi } from "@/api/ApiProvider";
import { writeSettings, type ThemePreference } from "@/lib/settings";
import { useTheme } from "@/theme/ThemeProvider";

const REMINDER_OPTIONS = [
  { days: 3, label: "3 days before", detail: null },
  { days: 7, label: "7 days before", detail: "Recommended" },
  { days: 15, label: "15 days before", detail: null },
] as const;

const THEME_OPTIONS: readonly {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "system", label: "System", icon: "phone-portrait-outline" },
];

export default function OnboardingPreferencesScreen() {
  const router = useRouter();
  const api = useApi();
  const queryClient = useQueryClient();
  const { tokens, preference, setPreference } = useTheme();
  const [leadDays, setLeadDays] = useState(7);
  const [theme, setTheme] = useState<ThemePreference>(preference);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setPending(true);
    setError(null);
    try {
      await setPreference(theme);
      await patchMe(api, { reminderLeadDays: leadDays });
      await queryClient.invalidateQueries({ queryKey: apiKeys.me() });
      await writeSettings({
        authOnboardingPending: false,
        authOnboardingCompletedAt: new Date().toISOString(),
      });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Unable to save your preferences."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <ScreenScroll gap={tokens.spacing.lg} contentStyle={styles.scrollContent}>
      <ScreenHeader
        title=""
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace("/onboarding/permissions")
        }
      />

      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: tokens.colors.textStrong }]}
        >
          Customize your experience
        </Text>
        <Text style={[styles.subtitle, { color: tokens.colors.textSubtle }]}>
          Set your preferences. You can change these anytime.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.text }]}>
            Reminder timing
          </Text>
          <Text
            style={[styles.sectionHint, { color: tokens.colors.textSubtle }]}
          >
            When should we remind you?
          </Text>
        </View>
        <View style={styles.optionStack}>
          {REMINDER_OPTIONS.map((option) => {
            const selected = leadDays === option.days;
            return (
              <Pressable
                key={option.days}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setLeadDays(option.days)}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: selected
                      ? tokens.colors.accent
                      : tokens.colors.border,
                    borderRadius: tokens.radius.lg,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: selected
                        ? tokens.colors.accent
                        : tokens.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <View style={styles.optionMeta}>
                  {option.detail ? (
                    <Text
                      style={[
                        styles.recommended,
                        {
                          color: tokens.colors.accent,
                          backgroundColor: tokens.colors.accentSoft,
                        },
                      ]}
                    >
                      {option.detail}
                    </Text>
                  ) : null}
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={
                      selected ? tokens.colors.accent : tokens.colors.outline
                    }
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.text }]}>
            App theme
          </Text>
          <Text
            style={[styles.sectionHint, { color: tokens.colors.textSubtle }]}
          >
            Choose your preferred theme.
          </Text>
        </View>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setTheme(option.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: selected
                      ? tokens.colors.accent
                      : tokens.colors.border,
                    borderRadius: tokens.radius.lg,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={
                    selected ? tokens.colors.accent : tokens.colors.textSubtle
                  }
                />
                <Text
                  style={[
                    styles.themeLabel,
                    {
                      color: selected
                        ? tokens.colors.accent
                        : tokens.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {error ? (
        <Text style={[styles.errorText, { color: tokens.colors.dangerText }]}>
          {error}
        </Text>
      ) : null}
      <Button
        label={pending ? "Saving..." : "Get started"}
        busy={pending}
        disabled={pending}
        size="lg"
        onPress={() => void finish()}
      />
      <Text style={[styles.footnote, { color: tokens.colors.textMuted }]}>
        You&apos;re all set. Let&apos;s organize your purchases.
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    minHeight: "100%",
    paddingBottom: 28,
  },
  heading: { gap: 7, marginTop: 8, marginBottom: 6 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "500", maxWidth: 340 },
  section: { gap: 10 },
  sectionHeader: { gap: 2 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  sectionHint: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  optionStack: { gap: 9 },
  optionRow: {
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLabel: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  optionMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  recommended: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  themeGrid: { flexDirection: "row", gap: 10 },
  themeOption: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  themeLabel: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  errorText: { textAlign: "center", fontSize: 13, lineHeight: 18 },
  footnote: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
});
