import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  Button,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useEnqueueMutation } from "@/offline";
import { useTheme } from "@/theme/ThemeProvider";

const LEAD_PRESETS = [
  { days: 7, label: "7 days before" },
  { days: 14, label: "14 days before" },
  { days: 30, label: "30 days before" },
  { days: 60, label: "60 days before" },
];

const DEFAULT_LEAD_DAYS = 30;

export default function LeadDaysScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: tokens.spacing.xl - 4,
          backgroundColor: tokens.colors.canvas,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        }}
      >
        <ScreenHeader title="Reminder Timing" />
      </View>

      <ScreenScroll
        gap={tokens.spacing.lg}
        safeTop={false}
        contentStyle={{
          paddingTop: tokens.spacing.lg,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
      >
        <View style={{ gap: tokens.spacing.xs }}>
          <AppText role="headline">Remind me</AppText>
          <AppText role="body" tone="subtle">
            Choose how early reminders arrive before a return or warranty
            deadline.
          </AppText>
        </View>

        <SectionCard flush>
          {LEAD_PRESETS.map((preset, idx) => {
            const isLast = idx === LEAD_PRESETS.length - 1;
            const isSelected = selectedDays === preset.days;
            return (
              <Pressable
                key={preset.days}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={preset.label}
                onPress={() => setPicked(preset.days)}
                style={({ pressed }) => [
                  styles.presetRow,
                  {
                    paddingVertical: tokens.spacing.lg,
                    paddingHorizontal: tokens.spacing.xl - 4,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: tokens.colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={{
                    color: isSelected
                      ? tokens.colors.accent
                      : tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: isSelected ? "700" : "500",
                  }}
                >
                  {preset.label}
                </Text>
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

        <Button
          label={saveMutation.isPending ? "Saving…" : "Save changes"}
          disabled={saveMutation.isPending}
          busy={saveMutation.isPending}
          onPress={() =>
            saveMutation.mutate({ reminderLeadDays: selectedDays })
          }
        />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
});
