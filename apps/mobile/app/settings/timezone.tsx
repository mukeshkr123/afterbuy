import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, useAdaptiveLayout } from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

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
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();

  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const [searchQuery, setSearchQuery] = useState("");

  const detected = detectTimezone();

  // Held as null until the user picks, so the saved value shows as selected
  // once /me resolves instead of being frozen at the initial render.
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
      router.back();
    },
  });

  // The device zone is always offered, even when it is not in the shortlist.
  const options = useMemo(() => {
    const all = COMMON_TIMEZONES.includes(detected)
      ? COMMON_TIMEZONES
      : [detected, ...COMMON_TIMEZONES];
    const q = searchQuery.trim().toLowerCase();
    return q ? all.filter((tz) => tz.toLowerCase().includes(q)) : all;
  }, [detected, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <FlatList
        data={options}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: "100%",
          maxWidth: contentWidth,
          alignSelf: "center",
          paddingBottom: Math.max(insets.bottom + 24, 32),
          flexGrow: options.length === 0 ? 1 : undefined,
        }}
        ListHeaderComponent={
          <View
            style={{
              padding: tokens.spacing.xl,
              gap: tokens.spacing.lg,
              backgroundColor: tokens.colors.canvas,
            }}
          >
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
                lineHeight: tokens.type.bodySmall.lineHeight,
              }}
            >
              Reminders are sent in the morning of this time zone.
            </Text>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderRadius: tokens.radius.md,
                  paddingHorizontal: tokens.spacing.md,
                  gap: tokens.spacing.sm,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={tokens.colors.icon}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search time zones"
                placeholderTextColor={tokens.colors.textMuted}
                accessibilityLabel="Search time zones"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.searchInput,
                  {
                    color: tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                  },
                ]}
              />
            </View>
          </View>
        }
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          <EmptyState
            icon="globe-outline"
            title="No matching time zones"
            message="Try a city or region name, for example Kolkata or Europe."
          />
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              marginLeft: tokens.spacing.lg,
              backgroundColor: tokens.colors.border,
            }}
          />
        )}
        renderItem={({ item: tz }) => {
          const isSelected = selectedTz === tz;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={tz.replace(/[_/]/g, " ")}
              onPress={() => setPicked(tz)}
              style={({ pressed }) => [
                styles.row,
                {
                  paddingVertical: tokens.spacing.md,
                  paddingHorizontal: tokens.spacing.lg,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: isSelected
                      ? tokens.colors.primary
                      : tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {tz}
                </Text>
                {tz === detected ? (
                  <Text
                    style={{
                      color: tokens.colors.textMuted,
                      fontSize: tokens.type.bodySmall.fontSize,
                    }}
                  >
                    Detected on this device
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={
                  isSelected ? tokens.colors.primary : tokens.colors.outline
                }
              />
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ padding: tokens.spacing.xl }}>
            <Button
              label={saveMutation.isPending ? "Saving…" : "Save time zone"}
              disabled={saveMutation.isPending}
              busy={saveMutation.isPending}
              onPress={() => saveMutation.mutate({ timezone: selectedTz })}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
});
