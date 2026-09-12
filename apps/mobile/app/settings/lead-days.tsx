import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";

const LEAD_PRESETS = [
  {
    days: 7,
    label: "7 days before",
    subtitle: "1 week notice • Best for quick returns",
  },
  {
    days: 14,
    label: "14 days before",
    subtitle: "2 weeks notice • Balanced warning",
  },
  {
    days: 30,
    label: "30 days before",
    subtitle: "1 month notice • Recommended standard",
  },
  {
    days: 60,
    label: "60 days before",
    subtitle: "2 months notice • Best for extended warranties",
  },
];

const DEFAULT_LEAD_DAYS = 30;

export default function LeadDaysScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });

  const [picked, setPicked] = useState<number | null>(null);
  const selectedDays = picked ?? me.data?.reminderLeadDays ?? DEFAULT_LEAD_DAYS;

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
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/profile");
    },
  });

  return (
    <View style={styles.container}>
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Modern Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Reminder Timing</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBox}>
          <Text style={styles.headline}>Early Warnings</Text>
          <Text style={styles.subheadline}>
            Choose how early notifications arrive before a return window or
            warranty coverage expires.
          </Text>
        </View>

        {/* Preset Cards Group */}
        <View style={styles.groupCard}>
          {LEAD_PRESETS.map((preset, idx) => {
            const isSelected = selectedDays === preset.days;
            const isLast = idx === LEAD_PRESETS.length - 1;

            return (
              <React.Fragment key={preset.days}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={preset.label}
                  onPress={() => setPicked(preset.days)}
                  style={({ pressed }) => [
                    styles.presetRow,
                    isSelected && styles.presetRowSelected,
                    pressed && styles.presetRowPressed,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.calendarIconBox,
                        {
                          backgroundColor: isSelected ? "#EDE9FE" : "#F1F5F9",
                        },
                      ]}
                    >
                      <Ionicons
                        name="alarm-outline"
                        size={20}
                        color={isSelected ? "#775DF5" : "#64748B"}
                      />
                    </View>
                    <View style={styles.textGroup}>
                      <Text
                        style={[
                          styles.presetLabel,
                          isSelected && styles.presetLabelSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <Text style={styles.presetSubtitle}>
                        {preset.subtitle}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>
                {!isLast && <View style={styles.separator} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Save Button */}
        <Pressable
          accessibilityRole="button"
          disabled={saveMutation.isPending}
          onPress={() =>
            saveMutation.mutate({ reminderLeadDays: selectedDays })
          }
          style={({ pressed }) => [
            styles.saveBtn,
            saveMutation.isPending && { opacity: 0.7 },
            pressed && styles.saveBtnPressed,
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Preferences</Text>
          )}
        </Pressable>
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
    gap: 24,
  },
  introBox: {
    gap: 6,
  },
  headline: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
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
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  presetRowSelected: {
    backgroundColor: "#F5F3FF",
  },
  presetRowPressed: {
    opacity: 0.8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  calendarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  presetLabelSelected: {
    color: "#775DF5",
  },
  presetSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
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
    marginLeft: 72,
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
