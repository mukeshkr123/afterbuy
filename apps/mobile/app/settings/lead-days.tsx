import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

const LEAD_PRESETS = [
  { days: 7, label: "7 Days Before" },
  { days: 14, label: "14 Days Before" },
  { days: 30, label: "30 Days Before" },
  { days: 60, label: "60 Days Before" },
];

export default function LeadDaysScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [selectedDays, setSelectedDays] = useState<number>(
    me.data?.reminderLeadDays ?? 30
  );

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";

  const saveMutation = useEnqueueMutation<
    { reminderLeadDays: number },
    unknown
  >({
    build: (input) => ({
      method: "PATCH",
      endpoint: "/v1/me",
      body: input,
      label: `Set lead time to ${input.reminderLeadDays} days`,
      optimisticPatch: {
        queryKey: apiKeys.me(),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? {
                ...(prev as Record<string, unknown>),
                reminderLeadDays: input.reminderLeadDays,
              }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: apiKeys.me() });
      router.back();
    },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: textColor }]}>
              Reminder Lead Time
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Subtitle Card */}
          <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
            <Ionicons name="alarm-outline" size={24} color="#4F46E5" />
            <Text style={[styles.infoText, { color: textMuted }]}>
              Select how many days in advance you want to receive warranty and
              return notifications.
            </Text>
          </View>

          {/* Preset Options List */}
          <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
            {LEAD_PRESETS.map((preset, idx) => {
              const isLast = idx === LEAD_PRESETS.length - 1;
              const isSelected = selectedDays === preset.days;

              return (
                <Pressable
                  key={preset.days}
                  style={({ pressed }) => [
                    styles.presetRow,
                    !isLast && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: 1,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedDays(preset.days)}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      { color: isSelected ? "#4F46E5" : textColor },
                    ]}
                  >
                    {preset.label}
                  </Text>

                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#4F46E5"
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={22}
                      color="#CBD5E1"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Save Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() =>
              saveMutation.mutate({ reminderLeadDays: selectedDays })
            }
          >
            <Text style={styles.saveButtonText}>Save Setting</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  groupCard: {
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
