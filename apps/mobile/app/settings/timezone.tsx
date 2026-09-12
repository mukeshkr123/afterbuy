import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function TimezoneScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [searchQuery, setSearchQuery] = useState("");

  const detected = detectTimezone();
  const [picked, setPicked] = useState<string | null>(null);
  const selectedTz = picked ?? me.data?.timezone ?? detected;

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
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/profile");
    },
  });

  const options = useMemo(() => {
    const all = COMMON_TIMEZONES.includes(detected)
      ? COMMON_TIMEZONES
      : [detected, ...COMMON_TIMEZONES];
    const q = searchQuery.trim().toLowerCase();
    return q ? all.filter((tz) => tz.toLowerCase().includes(q)) : all;
  }, [detected, searchQuery]);

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
        <Text style={styles.headerTitle}>Time Zone</Text>
        <View style={{ width: 42 }} />
      </View>

      <FlatList
        data={options}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.introBox}>
              <Text style={styles.headline}>Schedule Timing</Text>
              <Text style={styles.subheadline}>
                Notifications and return deadlines will be aligned to your
                chosen timezone.
              </Text>
            </View>

            {/* Search Box */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search city or timezone..."
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Search time zones"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            <Text style={styles.sectionHeading}>AVAILABLE REGIONS</Text>
          </View>
        }
        renderItem={({ item: tz, index }) => {
          const isSelected = selectedTz === tz;
          const isFirst = index === 0;
          const isLast = index === options.length - 1;

          return (
            <View
              style={[
                styles.itemWrapper,
                isFirst && styles.itemWrapperFirst,
                isLast && styles.itemWrapperLast,
              ]}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={tz.replace(/[_/]/g, " ")}
                onPress={() => setPicked(tz)}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.globeIconBox,
                      {
                        backgroundColor: isSelected ? "#EDE9FE" : "#F1F5F9",
                      },
                    ]}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={isSelected ? "#775DF5" : "#64748B"}
                    />
                  </View>
                  <View style={styles.tzInfo}>
                    <Text
                      style={[
                        styles.tzName,
                        isSelected && styles.tzNameSelected,
                      ]}
                    >
                      {tz}
                    </Text>
                    {tz === detected && (
                      <Text style={styles.detectedBadge}>
                        Detected on this device
                      </Text>
                    )}
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
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="globe-outline" size={28} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No matching timezones</Text>
            <Text style={styles.emptyText}>
              Try typing a city name like "New York", "London", or "Tokyo".
            </Text>
          </View>
        }
        ListFooterComponent={
          options.length > 0 ? (
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                disabled={saveMutation.isPending}
                onPress={() => saveMutation.mutate({ timezone: selectedTz })}
                style={({ pressed }) => [
                  styles.saveBtn,
                  saveMutation.isPending && { opacity: 0.7 },
                  pressed && styles.saveBtnPressed,
                ]}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Time Zone</Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
      />
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listHeader: {
    gap: 16,
    marginBottom: 12,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  clearBtn: {
    padding: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
    marginTop: 8,
  },
  itemWrapper: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemWrapperFirst: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  itemWrapperLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSelected: {
    backgroundColor: "#F5F3FF",
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  globeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tzInfo: {
    flex: 1,
    gap: 2,
  },
  tzName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  tzNameSelected: {
    color: "#775DF5",
  },
  detectedBadge: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    marginTop: 24,
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
