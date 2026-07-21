import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  EmptyState,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
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
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Time Zone" />

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
              borderRadius: tokens.radius.lg,
              paddingHorizontal: tokens.spacing.md + 2,
              gap: tokens.spacing.sm + 2,
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
                fontSize: tokens.type.body.fontSize - 1,
              },
            ]}
          />
        </View>

        {options.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon="globe-outline"
              title="No matching time zones"
              message="Try a city or region name, for example Kolkata or Europe."
            />
          </SectionCard>
        ) : (
          <SectionCard flush>
            {options.map((tz, idx) => {
              const isSelected = selectedTz === tz;
              const isLast = idx === options.length - 1;
              return (
                <Pressable
                  key={tz}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={tz.replace(/[_/]/g, " ")}
                  onPress={() => setPicked(tz)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      paddingVertical: tokens.spacing.md + 2,
                      paddingHorizontal: tokens.spacing.lg,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: tokens.colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: isSelected
                          ? tokens.colors.accent
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
                      isSelected ? tokens.colors.accent : tokens.colors.border
                    }
                  />
                </Pressable>
              );
            })}
          </SectionCard>
        )}

        <Button
          label={saveMutation.isPending ? "Saving…" : "Save time zone"}
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate({ timezone: selectedTz })}
        />
      </ScreenScroll>
    </>
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
