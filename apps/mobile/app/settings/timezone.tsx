import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

export default function TimezoneScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTz, setSelectedTz] = useState<string>(
    me.data?.timezone ?? "Asia/Kolkata"
  );

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FAFAFA";
  const cardBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const borderColor = isDark ? tokens.colors.border : "#F3F4F6";
  const inputBg = isDark ? tokens.colors.surface : "#F3F4F6";

  const detectedTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  const saveMutation = useEnqueueMutation<{ timezone: string }, unknown>({
    build: (input) => ({
      method: "PATCH",
      endpoint: "/v1/me",
      body: input,
      label: `Set timezone to ${input.timezone}`,
      optimisticPatch: {
        queryKey: apiKeys.me(),
        updater: (prev) =>
          prev && typeof prev === "object"
            ? { ...(prev as Record<string, unknown>), timezone: input.timezone }
            : prev,
        rollback: () => undefined,
      },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: apiKeys.me() });
      router.back();
    },
  });

  const filteredTzs = COMMON_TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Timezone
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search timezone..."
              placeholderTextColor="#9CA3AF"
              style={[styles.searchInput, { color: textColor }]}
              autoCapitalize="none"
            />
          </View>

          {/* Detected Timezone Quick Card */}
          <Pressable
            style={({ pressed }) => [
              styles.detectedCard,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setSelectedTz(detectedTz)}
          >
            <View style={styles.detectedLeft}>
              <Ionicons name="location-outline" size={22} color="#4F46E5" />
              <View>
                <Text style={[styles.detectedTitle, { color: textColor }]}>
                  System Timezone
                </Text>
                <Text style={[styles.detectedValue, { color: textMuted }]}>
                  {detectedTz}
                </Text>
              </View>
            </View>

            {selectedTz === detectedTz ? (
              <Ionicons name="checkmark-circle" size={22} color="#4F46E5" />
            ) : null}
          </Pressable>

          {/* Timezone Options List */}
          <View style={[styles.groupCard, { backgroundColor: cardBg }]}>
            {filteredTzs.map((tz, idx) => {
              const isLast = idx === filteredTzs.length - 1;
              const isSelected = selectedTz === tz;

              return (
                <Pressable
                  key={tz}
                  style={({ pressed }) => [
                    styles.tzRow,
                    !isLast && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: 1,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedTz(tz)}
                >
                  <Text
                    style={[
                      styles.tzLabel,
                      { color: isSelected ? "#4F46E5" : textColor },
                    ]}
                  >
                    {tz}
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
            onPress={() => saveMutation.mutate({ timezone: selectedTz })}
          >
            <Text style={styles.saveButtonText}>Save Timezone</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
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
  searchBox: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  detectedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detectedTestRow: {
    gap: 2,
  },
  detectedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  detectedTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  detectedValue: {
    fontSize: 13,
    marginTop: 1,
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
  tzRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  tzLabel: {
    fontSize: 15,
    fontWeight: "600",
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
