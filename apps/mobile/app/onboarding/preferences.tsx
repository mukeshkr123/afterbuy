import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AuthHeroIllustration, Button, ScreenScroll } from "@/components";
import { patchMe } from "@/api/auth";
import { apiKeys } from "@/api/apiKeys";
import { useApi } from "@/api/ApiProvider";
import { writeSettings, type ThemePreference } from "@/lib/settings";
import { useTheme } from "@/theme/ThemeProvider";
import { registerCurrentDevice } from "@/notifications/PushRegistration";

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

const PUSH_ENABLED = process.env["EXPO_PUBLIC_PUSH_ENABLED"] === "true";

export default function OnboardingPreferencesScreen() {
  const router = useRouter();
  const api = useApi();
  const queryClient = useQueryClient();
  const { tokens, preference, setPreference } = useTheme();
  const [leadDays, setLeadDays] = useState(7);
  const [theme, setTheme] = useState<ThemePreference>(preference ?? "system");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setPending(true);
    setError(null);
    try {
      await setPreference(theme);
      let pushEnabled = false;
      if (PUSH_ENABLED) {
        const current = await Notifications.getPermissionsAsync();
        const permission =
          current.status === "granted"
            ? current
            : await Notifications.requestPermissionsAsync();
        pushEnabled = permission.status === "granted";
        if (pushEnabled) {
          await registerCurrentDevice(api);
        }
      }
      await patchMe(api, { reminderLeadDays: leadDays, pushEnabled });
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
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <ScreenScroll gap={0} contentStyle={styles.scrollContent}>
        {/* Top Back Button */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(auth)/sign-up")
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={({ pressed }) => [
              styles.backCircle,
              pressed && styles.backCirclePressed,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
        </View>

        {/* 3D Hero Illustration */}
        <AuthHeroIllustration />

        {/* Heading (Left-Aligned) */}
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Customize your experience
          </Text>
          <Text style={styles.subtitle}>
            Set your preferences. You can change these anytime.
          </Text>
        </View>

        {/* Section 1: Reminder Timing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reminder timing</Text>
            <Text style={styles.sectionHint}>When should we remind you?</Text>
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
                    selected
                      ? styles.optionRowSelected
                      : styles.optionRowDefault,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View style={styles.optionMeta}>
                    {option.detail ? (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>
                          {option.detail}
                        </Text>
                      </View>
                    ) : null}
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={selected ? "#4F46E5" : "#94A3B8"}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: App Theme */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>App theme</Text>
            <Text style={styles.sectionHint}>Choose your preferred theme.</Text>
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
                    selected
                      ? styles.themeOptionSelected
                      : styles.themeOptionDefault,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={selected ? "#4F46E5" : "#0F172A"}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      selected && styles.themeLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Primary Action Button */}
        <Button
          label={pending ? "Saving..." : "Get started"}
          trailing={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          busy={pending}
          disabled={pending}
          size="lg"
          onPress={() => void finish()}
          style={styles.primaryButton}
        />

        {/* Footnote */}
        <Text style={styles.footnote}>
          You&apos;re all set. Let&apos;s organize your purchases.
        </Text>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    height: 38,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  backCirclePressed: {
    opacity: 0.75,
  },
  heading: {
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "left",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "left",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionHint: {
    fontSize: 13.5,
    lineHeight: 18,
    color: "#475569",
    marginTop: 2,
  },
  optionStack: {
    gap: 9,
  },
  optionRow: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionRowDefault: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionRowSelected: {
    backgroundColor: "#F6F6FF",
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  optionLabel: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  optionLabelSelected: {
    color: "#4338CA",
  },
  optionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recommendedBadge: {
    backgroundColor: "#EEF0FE",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  themeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    height: 86,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  themeOptionDefault: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  themeOptionSelected: {
    backgroundColor: "#F5F4FE",
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  themeLabel: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  themeLabelSelected: {
    color: "#4F46E5",
  },
  errorText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: "#DC2626",
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 14,
    minHeight: 52,
  },
  footnote: {
    textAlign: "center",
    fontSize: 12.5,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 10,
  },
});
