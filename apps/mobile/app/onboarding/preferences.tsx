import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AuthHeroIllustration } from "@/components";
import { patchMe } from "@/api/auth";
import { apiKeys } from "@/api/apiKeys";
import { useApi } from "@/api/ApiProvider";
import { writeSettings, type ThemePreference } from "@/lib/settings";
import { useTheme } from "@/theme/ThemeProvider";
import { registerCurrentDevice } from "@/notifications/PushRegistration";

const REMINDER_OPTIONS = [
  {
    days: 3,
    label: "3 days before",
    subtitle: "Best for immediate action",
    detail: null,
  },
  {
    days: 7,
    label: "7 days before",
    subtitle: "Standard 1-week notice",
    detail: "Recommended",
  },
  {
    days: 15,
    label: "15 days before",
    subtitle: "Extended 2-week notice",
    detail: null,
  },
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
  const insets = useSafeAreaInsets();
  const api = useApi();
  const queryClient = useQueryClient();
  const { preference, setPreference } = useTheme();
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
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-up")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeroIllustration compact />

        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Personalize your setup
          </Text>
          <Text style={styles.subtitle}>
            Choose how early you want alerts and customize how AfterBuy looks.
          </Text>
        </View>

        {/* Section 1: Reminder Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>REMINDER TIMING</Text>
          <View style={styles.groupCard}>
            {REMINDER_OPTIONS.map((option, idx) => {
              const selected = leadDays === option.days;
              const isLast = idx === REMINDER_OPTIONS.length - 1;

              return (
                <React.Fragment key={option.days}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                    onPress={() => setLeadDays(option.days)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.alarmIconBox,
                          {
                            backgroundColor: selected ? "#EDE9FE" : "#F1F5F9",
                          },
                        ]}
                      >
                        <Ionicons
                          name="alarm-outline"
                          size={18}
                          color={selected ? "#775DF5" : "#64748B"}
                        />
                      </View>
                      <View style={{ gap: 2 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              selected && styles.optionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.detail ? (
                            <View style={styles.recommendedBadge}>
                              <Text style={styles.recommendedText}>
                                {option.detail}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.optionSubtitle}>
                          {option.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        selected && styles.radioCircleSelected,
                      ]}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>
                  {!isLast && <View style={styles.separator} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Section 2: App Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>APP THEME</Text>
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
                    selected && styles.themeOptionSelected,
                    pressed && styles.themeOptionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.themeIconBox,
                      selected && styles.themeIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={selected ? "#775DF5" : "#64748B"}
                    />
                  </View>
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
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void finish()}
          style={({ pressed }) => [
            styles.primaryBtn,
            pending && { opacity: 0.7 },
            pressed && styles.primaryBtnPressed,
          ]}
        >
          {pending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Get started</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        <Text style={styles.footnote}>
          You&apos;re all set. Let&apos;s start organizing your purchases.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 22,
  },
  heading: {
    gap: 6,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 320,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionRowSelected: {
    backgroundColor: "#F5F3FF",
  },
  optionRowPressed: {
    opacity: 0.8,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  alarmIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  optionLabelSelected: {
    color: "#775DF5",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  recommendedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: "#775DF5",
    backgroundColor: "#775DF5",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 66,
  },
  themeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  themeOptionSelected: {
    borderColor: "#775DF5",
    backgroundColor: "#F5F3FF",
  },
  themeOptionPressed: {
    opacity: 0.8,
  },
  themeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  themeIconBoxSelected: {
    backgroundColor: "#EDE9FE",
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  themeLabelSelected: {
    color: "#775DF5",
    fontWeight: "700",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footnote: {
    textAlign: "center",
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
